<?php

namespace App\Services\Journey;

use App\Models\ActiveJourney;
use App\Models\Journey;
use App\Models\JourneyEvent;
use App\Models\JourneyProgress;
use App\Models\JourneyTrack;
use App\Models\TransitStop;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * Deterministic location tracking for an active journey.
 *
 * - The nearest stop is computed only among the stops of the journey's own
 *   legs (ties broken by distance, then stop id).
 * - current_leg_index advances monotonically: it never regresses, and a leg
 *   counts as reached when the location is within the arrival radius of any
 *   of its stop endpoints (or, for the final leg, the destination point).
 * - Progress percent is time-based: elapsed / planned duration, capped.
 *
 * No deviation detection, missed-stop or recovery logic lives here yet.
 */
class JourneyTrackingService
{
    /** Distance at which a location counts as an arrival/stop event. */
    public const STOP_EVENT_RADIUS_METERS = 50;

    /** Distance within which a leg endpoint counts the leg as reached. */
    public const LEG_ARRIVAL_RADIUS_METERS = 60;

    /**
     * A ping is a backfill when it arrives OLDER than the newest ping already
     * recorded for the journey (out-of-order retry / tunnel flush arriving
     * after newer fixes) — or when the client explicitly flags it.
     *
     * Backfills are recorded honestly (a backfilled stop event is real
     * history: the rider WAS there) but never fire deviation detection and
     * never regress progress: judging a stale position against the live plan
     * after the rider moved on would manufacture false off-route events.
     *
     * Deliberately NOT wall-clock based: every ping is evaluated at its own
     * recorded_at (same as a live arrival), so an in-order tunnel flush
     * replays history faithfully instead of being muted.
     */
    public const OUT_OF_ORDER_GRACE_SEC = 30;

    public function __construct(private GeoCalculator $geo, private DeviationDetectionService $deviations)
    {
    }

    /**
     * Record a location update and recompute the tracking state.
     *
     * @param array $data latitude, longitude, optional recorded_at/speed_kph/bearing_deg/accuracy_meters.
     */
    public function updateLocation(ActiveJourney $activeJourney, array $data): array
    {
        if (!in_array($activeJourney->status, ['active', 'deviated', 'rerouted'], true)) {
            throw new InvalidArgumentException("Only an in-flight journey can be updated; this one is '{$activeJourney->status}'.");
        }

        $wasDeviated = $activeJourney->status === 'deviated';

        $journey = $activeJourney->journey()->with('journeyLegs')->firstOrFail();
        $legs = $journey->journeyLegs->sortBy('sequence')->values();

        $recordedAt = isset($data['recorded_at'])
            ? Carbon::parse($data['recorded_at'])
            : Carbon::now();
        $latitude = (float) $data['latitude'];
        $longitude = (float) $data['longitude'];

        $stops = $this->journeyStops($journey);
        $nearest = $this->nearestStop($stops, $latitude, $longitude);

        $accuracy = isset($data['accuracy_meters'])
            ? (float) $data['accuracy_meters']
            : (isset($data['accuracy']) ? (float) $data['accuracy'] : null);

        // Idempotency: the client allocates client_seq BEFORE the first POST
        // attempt, so a live ping that timed out on the wire but was recorded
        // is safely retried from the offline queue without a duplicate row.
        $clientSeq = isset($data['client_seq']) ? (int) $data['client_seq'] : null;
        $duplicateProgress = null;
        if ($clientSeq !== null && $clientSeq >= 1) {
            $duplicateProgress = JourneyProgress::where('active_journey_id', $activeJourney->id)
                ->where('client_seq', $clientSeq)
                ->first();
        }

        // Backfill: explicitly flagged by the client, or older than the newest
        // already-recorded ping (out-of-order retry arriving after the rider
        // moved on). In-order flushes evaluate exactly like live arrivals.
        $latestRecordedAt = JourneyProgress::where('active_journey_id', $activeJourney->id)->max('recorded_at');
        $isBackfill = !empty($data['is_backfill'])
            || ($latestRecordedAt !== null
                && $recordedAt->lessThan(Carbon::parse($latestRecordedAt)->subSeconds(self::OUT_OF_ORDER_GRACE_SEC)));

        if ($duplicateProgress === null) {
            $progress = JourneyProgress::create([
                'active_journey_id' => $activeJourney->id,
                'client_seq' => $clientSeq,
                'is_backfill' => $isBackfill,
                'recorded_at' => $recordedAt,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'speed_kph' => $data['speed_kph'] ?? (isset($data['speed_mps']) ? ((float) $data['speed_mps']) * 3.6 : null),
                'bearing_deg' => $data['bearing_deg'] ?? null,
                'accuracy_meters' => $accuracy,
                'nearest_stop_id' => $nearest['stop']?->id,
                'nearest_stop_distance_meters' => $nearest['stop'] !== null ? round($nearest['distance'], 3) : null,
                'is_stop_event' => $nearest['stop'] !== null && $nearest['distance'] <= self::STOP_EVENT_RADIUS_METERS,
            ]);

            // Persist to journey_tracks per ERD v2.1
            JourneyTrack::create([
                'journey_id' => $activeJourney->journey_id,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'accuracy_m' => $accuracy !== null ? (int) round($accuracy) : null,
                'recorded_at' => $recordedAt,
            ]);
        } else {
            // Duplicate delivery: report the stored row, never re-record.
            // A backfilled stop event is real history (the rider WAS there),
            // so is_stop_event stays as stored; only the deviation trigger
            // below is suppressed for backfills and duplicates alike.
            $progress = $duplicateProgress;
            $isBackfill = (bool) $progress->is_backfill;
        }

        // When accuracy > 120m, GPS is too noisy: store in journey_progress but ignore for deviation and leg advancement.
        $skipDeviationAndAdvancement = $accuracy !== null && $accuracy > 120.0;

        // Deviation detection only runs while the journey is moving along its
        // plan; while 'deviated' the existing event stands. Backfills and
        // duplicate deliveries never fire new deviations.
        $deviationEvent = null;
        if (!$wasDeviated && !$skipDeviationAndAdvancement && !$isBackfill && $duplicateProgress === null) {
            $deviationEvent = $this->deviations->detect($activeJourney, $recordedAt, $latitude, $longitude, $nearest, $data);

            if ($deviationEvent !== null) {
                JourneyEvent::create([
                    'journey_id' => $activeJourney->journey_id,
                    'event_type' => 'deviation',
                    'payload_json' => [
                        'deviation_event_id' => $deviationEvent->id,
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                    ],
                    'created_at' => $recordedAt,
                ]);
            }
        }

        $currentLegIndex = $skipDeviationAndAdvancement
            ? $activeJourney->current_leg_index
            : $this->resolveCurrentLegIndex($legs, $latitude, $longitude, $activeJourney->current_leg_index);

        $observedSpeedMps = isset($data['speed_mps'])
            ? (float) $data['speed_mps']
            : (isset($data['speed_kph']) ? ((float) $data['speed_kph']) / 3.6 : 0.0);

        $distanceEta = $this->computeDistanceEta(
            $journey,
            $legs,
            $currentLegIndex,
            $latitude,
            $longitude,
            $observedSpeedMps,
            $recordedAt,
            $activeJourney
        );

        $percent = (isset($data['speed_mps']) || isset($data['use_distance_progress']))
            ? $distanceEta['distance_progress_percent']
            : $this->progressPercent($journey, $activeJourney, $recordedAt);

        if ($duplicateProgress !== null) {
            // Duplicate delivery: journey state already reflects this (or a
            // newer) ping — never move progress backwards, never rewrite.
            $percent = (float) $activeJourney->current_progress_percent;
            $currentLegIndex = $activeJourney->current_leg_index;
        } else {
            if ($isBackfill) {
                // A backfill computed from an old fix must never regress the
                // live progress the rider has since earned.
                $percent = max($percent, (float) $activeJourney->current_progress_percent);
            }
            $activeJourney->update([
                'current_leg_index' => $currentLegIndex,
                'current_progress_percent' => $percent,
            ]);

            $activeJourney->refresh();
        }

        return [
            'active_journey' => $activeJourney,
            'progress' => $progress,
            'deviation_event' => $deviationEvent,
            'tracking' => $this->trackingState($activeJourney, $nearest, $currentLegIndex, $percent, $distanceEta),
            'gap_ack' => [
                'accepted' => true,
                'duplicate' => $duplicateProgress !== null,
                'backfill' => $isBackfill,
                'client_seq' => $clientSeq,
            ],
        ];
    }

    /**
     * Compute the tracking state without recording a new location update.
     */
    public function currentState(ActiveJourney $activeJourney): array
    {
        $journey = $activeJourney->relationLoaded('journey') && $activeJourney->journey !== null
            ? $activeJourney->journey
            : $activeJourney->journey()->with('journeyLegs')->firstOrFail();
        $legs = $journey->relationLoaded('journeyLegs')
            ? $journey->journeyLegs->sortBy('sequence')->values()
            : $journey->journeyLegs()->orderBy('sequence')->get();

        $latest = $activeJourney->relationLoaded('latestJourneyProgress')
            ? $activeJourney->latestJourneyProgress
            : ($activeJourney->relationLoaded('journeyProgress')
                ? $activeJourney->journeyProgress->sortByDesc('recorded_at')->sortByDesc('id')->first()
                : $activeJourney->journeyProgress()->orderByDesc('recorded_at')->orderByDesc('id')->first());

        $nearest = ['stop' => null, 'distance' => null];
        $lat = $latest ? (float) $latest->latitude : (float) $journey->origin_lat;
        $lng = $latest ? (float) $latest->longitude : (float) $journey->origin_lng;
        $speed = $latest?->speed_kph ? ((float) $latest->speed_kph) / 3.6 : 0.0;

        if ($latest && $latest->nearest_stop_id) {
            $stop = null;
            if ($journey->relationLoaded('journeyLegs')) {
                $stop = $legs->pluck('transitStopFrom')->merge($legs->pluck('transitStopTo'))->firstWhere('id', $latest->nearest_stop_id);
            }
            if ($stop === null) {
                $stop = TransitStop::find($latest->nearest_stop_id);
            }
            $nearest = [
                'stop' => $stop,
                'distance' => $stop !== null
                    ? $this->geo::distanceMeters((float) $latest->latitude, (float) $latest->longitude, (float) $stop->latitude, (float) $stop->longitude)
                    : null,
            ];
        }

        $distanceEta = $this->computeDistanceEta(
            $journey,
            $legs,
            $activeJourney->current_leg_index,
            $lat,
            $lng,
            $speed,
            $latest ? Carbon::parse($latest->recorded_at) : Carbon::now(),
            $activeJourney
        );

        return $this->trackingState(
            $activeJourney,
            $nearest,
            $activeJourney->current_leg_index,
            (float) $activeJourney->current_progress_percent,
            $distanceEta
        );
    }

    /**
     * Tracking state: current leg, next stop, stop-event flag, and distance ETA.
     */
    private function trackingState(
        ActiveJourney $activeJourney,
        array $nearest,
        int $currentLegIndex,
        float $percent,
        array $distanceEta = []
    ): array {
        $legs = $activeJourney->journey->journeyLegs->sortBy('sequence')->values();
        $currentLeg = $legs[$currentLegIndex] ?? null;

        return [
            'current_leg_index' => $currentLegIndex,
            'current_leg' => $currentLeg ? [
                'id' => $currentLeg->id,
                'sequence' => $currentLeg->sequence,
                'mode' => $currentLeg->mode,
            ] : null,
            'progress_percent' => round($percent, 2),
            'remaining_eta_sec' => $distanceEta['remaining_eta_sec'] ?? null,
            'delay_sec' => $distanceEta['delay_sec'] ?? 0,
            'distance_remaining_m' => $distanceEta['distance_remaining_m'] ?? null,
            'nearest_stop' => $nearest['stop'] ? [
                'id' => $nearest['stop']->id,
                'name' => $nearest['stop']->name,
                'latitude' => $nearest['stop']->latitude,
                'longitude' => $nearest['stop']->longitude,
                'distance_meters' => $nearest['distance'] !== null ? round($nearest['distance'], 1) : null,
            ] : null,
            'is_stop_event' => $nearest['stop'] !== null && $nearest['distance'] <= self::STOP_EVENT_RADIUS_METERS,
            'next_stop' => $this->nextStop($legs, $currentLegIndex),
            'deviation' => $this->deviationState($activeJourney),
        ];
    }

    /**
     * Distance ETA calculation: snapped current leg remaining + future legs,
     * speed = max(observed, 1.3 walk / 8.0 transit), delay = max(0, eta - plannedRemaining).
     */
    private function computeDistanceEta(
        Journey $journey,
        Collection $legs,
        int $currentLegIndex,
        float $latitude,
        float $longitude,
        float $observedSpeedMps,
        Carbon $recordedAt,
        ActiveJourney $activeJourney
    ): array {
        $currentLeg = $legs[$currentLegIndex] ?? null;
        $currentLegRemainingMeters = 0.0;

        if ($currentLeg !== null) {
            $geometry = $currentLeg->geometry;
            if (is_array($geometry) && count($geometry) >= 2) {
                $bestSegment = 0;
                $bestT = 0.0;
                $minDist = null;
                $count = count($geometry);

                for ($i = 0; $i < $count - 1; $i++) {
                    $p1 = $geometry[$i];
                    $p2 = $geometry[$i + 1];
                    if (!isset($p1[0], $p1[1], $p2[0], $p2[1])) {
                        continue;
                    }
                    $dist = $this->geo::pointToSegmentDistanceMeters(
                        $latitude,
                        $longitude,
                        (float) $p1[0],
                        (float) $p1[1],
                        (float) $p2[0],
                        (float) $p2[1]
                    );
                    if ($minDist === null || $dist < $minDist) {
                        $minDist = $dist;
                        $bestSegment = $i;
                        $bestT = $this->projectionT(
                            $latitude,
                            $longitude,
                            (float) $p1[0],
                            (float) $p1[1],
                            (float) $p2[0],
                            (float) $p2[1]
                        );
                    }
                }

                $p1 = $geometry[$bestSegment];
                $p2 = $geometry[$bestSegment + 1];
                $segLen = $this->geo::distanceMeters((float)$p1[0], (float)$p1[1], (float)$p2[0], (float)$p2[1]);
                $currentLegRemainingMeters += (1.0 - $bestT) * $segLen;

                for ($j = $bestSegment + 1; $j < $count - 1; $j++) {
                    $currentLegRemainingMeters += $this->geo::distanceMeters(
                        (float)$geometry[$j][0],
                        (float)$geometry[$j][1],
                        (float)$geometry[$j + 1][0],
                        (float)$geometry[$j + 1][1]
                    );
                }
            } else {
                $t = $this->projectionT(
                    $latitude,
                    $longitude,
                    (float) $currentLeg->from_lat,
                    (float) $currentLeg->from_lng,
                    (float) $currentLeg->to_lat,
                    (float) $currentLeg->to_lng
                );
                $totalLegDist = $currentLeg->distance_meters > 0
                    ? (float) $currentLeg->distance_meters
                    : $this->geo::distanceMeters(
                        (float) $currentLeg->from_lat,
                        (float) $currentLeg->from_lng,
                        (float) $currentLeg->to_lat,
                        (float) $currentLeg->to_lng
                    );
                $currentLegRemainingMeters = (1.0 - $t) * $totalLegDist;
            }
        }

        $isWalking = ($currentLeg?->mode === 'walking');
        $minSpeed = $isWalking ? 1.3 : 8.0;
        $currentSpeed = max($observedSpeedMps, $minSpeed);
        $currentLegEtaSec = $currentSpeed > 0 ? (int) round($currentLegRemainingMeters / $currentSpeed) : 0;

        $futureLegsDistance = 0.0;
        $futureLegsEtaSec = 0;
        $countLegs = $legs->count();

        for ($k = $currentLegIndex + 1; $k < $countLegs; $k++) {
            $leg = $legs[$k];
            $legDist = $leg->distance_meters > 0 ? (float) $leg->distance_meters : 0.0;
            if ($legDist <= 0.0) {
                if (is_array($leg->geometry) && count($leg->geometry) >= 2) {
                    for ($m = 0; $m < count($leg->geometry) - 1; $m++) {
                        $legDist += $this->geo::distanceMeters(
                            (float)$leg->geometry[$m][0],
                            (float)$leg->geometry[$m][1],
                            (float)$leg->geometry[$m + 1][0],
                            (float)$leg->geometry[$m + 1][1]
                        );
                    }
                } else {
                    $legDist = $this->geo::distanceMeters(
                        (float) $leg->from_lat,
                        (float) $leg->from_lng,
                        (float) $leg->to_lat,
                        (float) $leg->to_lng
                    );
                }
            }
            $futureLegsDistance += $legDist;

            if ($leg->duration_sec > 0) {
                $futureLegsEtaSec += (int) $leg->duration_sec;
            } else {
                $legMinSpeed = ($leg->mode === 'walking') ? 1.3 : 8.0;
                $futureLegsEtaSec += (int) round($legDist / $legMinSpeed);
            }
        }

        $distanceRemainingM = (int) round($currentLegRemainingMeters + $futureLegsDistance);
        $remainingEtaSec = (int) round($currentLegEtaSec + $futureLegsEtaSec);

        $totalPlannedSec = (int) $journey->total_duration_sec;
        $elapsedSec = max(0, $recordedAt->getTimestamp() - $activeJourney->started_at->getTimestamp());
        $plannedRemainingSec = max(0, $totalPlannedSec - $elapsedSec);
        $delaySec = max(0, $remainingEtaSec - $plannedRemainingSec);

        $totalJourneyDistance = (float) $legs->sum(fn ($l) => $l->distance_meters ?? 0);
        if ($totalJourneyDistance <= 0.0) {
            $totalJourneyDistance = (float) ($distanceRemainingM + 1);
        }
        $traveledM = max(0.0, $totalJourneyDistance - $distanceRemainingM);
        $distanceProgressPercent = min(100.0, max(0.0, round(($traveledM / $totalJourneyDistance) * 100, 2)));

        return [
            'distance_remaining_m' => $distanceRemainingM,
            'remaining_eta_sec' => $remainingEtaSec,
            'delay_sec' => $delaySec,
            'distance_progress_percent' => $distanceProgressPercent,
        ];
    }

    /**
     * Compute projection factor t onto segment [0.0, 1.0].
     */
    private function projectionT(float $lat, float $lng, float $segLat1, float $segLng1, float $segLat2, float $segLng2): float
    {
        $midLat = ($segLat1 + $segLat2) / 2;
        $metersPerDegLat = 111320.0;
        $metersPerDegLng = 111320.0 * cos(deg2rad($midLat));

        $ax = 0.0;
        $ay = 0.0;
        $bx = ($segLat2 - $segLat1) * $metersPerDegLat;
        $by = ($segLng2 - $segLng1) * $metersPerDegLng;
        $px = ($lat - $segLat1) * $metersPerDegLat;
        $py = ($lng - $segLng1) * $metersPerDegLng;

        $dx = $bx - $ax;
        $dy = $by - $ay;
        $lengthSq = $dx * $dx + $dy * $dy;
        if ($lengthSq <= 0.0) {
            return 0.0;
        }

        return max(0.0, min(1.0, ($px * $dx + $py * $dy) / $lengthSq));
    }

    /**
     * Deviation context for a deviated journey: the latest event and whether
     * the journey can continue without rerouting.
     */
    private function deviationState(ActiveJourney $activeJourney): ?array
    {
        if ($activeJourney->status !== 'deviated') {
            return null;
        }

        $event = $activeJourney->relationLoaded('latestDeviationEvent')
            ? $activeJourney->latestDeviationEvent
            : ($activeJourney->relationLoaded('deviationEvents')
                ? $activeJourney->deviationEvents->sortByDesc('occurred_at')->sortByDesc('id')->first()
                : $activeJourney->deviationEvents()->orderByDesc('occurred_at')->orderByDesc('id')->first());

        if ($event === null) {
            return null;
        }

        return [
            'id' => $event->id,
            'deviation_type' => $event->deviation_type,
            'severity' => $event->severity,
            'description' => $event->description,
            'expected_stop_id' => $event->expected_stop_id,
            'occurred_at' => $event->occurred_at,
            'can_continue' => $this->deviations->canContinue($event),
        ];
    }

    /**
     * Advance the current leg index to the highest leg whose to-endpoint
     * (its completion point) is within the arrival radius of the location;
     * never regress.
     */
    private function resolveCurrentLegIndex(Collection $legs, float $latitude, float $longitude, int $currentIndex): int
    {
        $resolved = $currentIndex;

        foreach ($legs as $index => $leg) {
            if ($this->geo::distanceMeters($latitude, $longitude, (float) $leg->to_lat, (float) $leg->to_lng)
                <= self::LEG_ARRIVAL_RADIUS_METERS) {
                $resolved = max($resolved, (int) $index);
            }
        }

        return min($resolved, max(0, $legs->count() - 1));
    }

    /**
     * Time-based progress: elapsed / planned journey duration, 0-100.
     */
    private function progressPercent(Journey $journey, ActiveJourney $activeJourney, Carbon $recordedAt): float
    {
        $planned = (int) $journey->total_duration_sec;

        if ($planned <= 0) {
            return 100.0;
        }

        $elapsed = max(0, $recordedAt->getTimestamp() - $activeJourney->started_at->getTimestamp());

        return min(100.0, round(($elapsed / $planned) * 100, 2));
    }

    /**
     * Next stop: the to-stop of the current transit leg, or of the first
     * later transit leg when the current leg is a walk.
     */
    private function nextStop(Collection $legs, int $currentIndex): ?array
    {
        foreach ($legs->slice($currentIndex) as $leg) {
            if ($leg->transit_stop_to_id !== null && $leg->transitStopTo !== null) {
                return [
                    'id' => $leg->transitStopTo->id,
                    'name' => $leg->transitStopTo->name,
                    'latitude' => $leg->transitStopTo->latitude,
                    'longitude' => $leg->transitStopTo->longitude,
                ];
            }
        }

        return null;
    }

    /**
     * Unique transit stops used by the journey's legs, ordered by id.
     */
    private function journeyStops(Journey $journey): Collection
    {
        $stopIds = $journey->journeyLegs
            ->pluck('transit_stop_from_id')
            ->merge($journey->journeyLegs->pluck('transit_stop_to_id'))
            ->filter()
            ->unique()
            ->values();

        return TransitStop::whereIn('id', $stopIds)->orderBy('id')->get();
    }

    /**
     * Nearest journey stop to a location; ties broken by stop id.
     */
    private function nearestStop(Collection $stops, float $latitude, float $longitude): array
    {
        $best = ['stop' => null, 'distance' => null];

        foreach ($stops as $stop) {
            $distance = $this->geo::distanceMeters($latitude, $longitude, (float) $stop->latitude, (float) $stop->longitude);

            if ($best['stop'] === null || $distance < $best['distance']) {
                $best = ['stop' => $stop, 'distance' => $distance];
            }
        }

        return $best;
    }
}
