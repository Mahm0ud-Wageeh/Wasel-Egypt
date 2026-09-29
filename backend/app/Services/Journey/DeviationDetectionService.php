<?php

namespace App\Services\Journey;

use App\Models\ActiveJourney;
use App\Models\DeviationEvent;
use App\Models\JourneyLeg;
use App\Services\Notifications\NotificationService;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Deterministic deviation detection for an active journey.
 *
 * Detection runs only while the journey is 'active' or 'rerouted' and only
 * once the user has boarded a transit leg (a stop event was recorded at the
 * leg's boarding stop and not yet at its alighting stop). Walking legs and
 * the pre-boarding access walk never trigger deviations.
 *
 * Rules (in evaluation order, first match wins):
 *   1. off_route    - the location is farther than OFF_ROUTE_THRESHOLD_METERS
 *                     from the boarded leg's corridor (straight segment
 *                     between its endpoints). Severity is 'high' (the journey
 *                     cannot simply continue) beyond OFF_ROUTE_HIGH_METERS.
 *   2. missed_stop  - the recorded time is more than MISSED_STOP_GRACE_SEC
 *                     past the leg's planned arrival at its alighting stop
 *                     while the location is still not near that stop.
 *
 * 'early', 'late' and 'vehicle_change' are valid enum values but are not
 * auto-detected yet.
 */
class DeviationDetectionService
{
    public const TOLERANCE_WALK_METERS = 50.0;
    public const TOLERANCE_TRANSIT_METERS = 100.0; // in 90-120m corridor
    public const OFF_ROUTE_THRESHOLD_METERS = 100.0;
    public const OFF_ROUTE_HIGH_METERS = 1000.0;
    public const MISSED_STOP_GRACE_SEC = 900;
    public const MISSED_STOP_EARLY_GRACE_SEC = 120;
    public const MISSED_STOP_DISTANCE_METERS = 250.0;

    public function __construct(private GeoCalculator $geo, private NotificationService $notifications)
    {
    }

    /**
     * Compute the minimum distance from a point to the leg corridor in meters.
     * Uses min pointToSegmentDistanceMeters over leg.geometry polylines if present,
     * falling back to the straight segment between endpoints only if null or < 2 points.
     */
    public function corridorDistanceMeters(JourneyLeg $leg, float $latitude, float $longitude): float
    {
        $geometry = $leg->geometry;

        if (is_array($geometry) && count($geometry) >= 2) {
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
                }
            }
            if ($minDist !== null) {
                return $minDist;
            }
        }

        return $this->geo::pointToSegmentDistanceMeters(
            $latitude,
            $longitude,
            (float) $leg->from_lat,
            (float) $leg->from_lng,
            (float) $leg->to_lat,
            (float) $leg->to_lng,
        );
    }

    /**
     * Corridor tolerance per mode: 50m for walking, 100m for transit (90-120m corridor).
     */
    public function corridorTolerance(JourneyLeg $leg): float
    {
        return $leg->mode === 'walking'
            ? self::TOLERANCE_WALK_METERS
            : self::TOLERANCE_TRANSIT_METERS;
    }

    /**
     * Evaluate one location update against the journey plan.
     *
     * @param array $context Result of the tracking computation:
     *                       ['nearest_stop' => TransitStop|null, 'nearest_distance' => float|null].
     * @param array $data Optional location update payload with speed/accuracy.
     * @return DeviationEvent|null The persisted deviation event, if one fired.
     */
    public function detect(
        ActiveJourney $activeJourney,
        Carbon $recordedAt,
        float $latitude,
        float $longitude,
        array $context,
        array $data = []
    ): ?DeviationEvent {
        if (!in_array($activeJourney->status, ['active', 'rerouted'], true)) {
            return null;
        }

        $boardedLeg = $this->boardedLeg($activeJourney);

        if ($boardedLeg === null) {
            return null;
        }

        $alightingStop = $boardedLeg->transitStopTo;

        // 1. Missed stop & early overshoot detection (evaluated first when past arrival)
        if ($boardedLeg->arrival_time !== null && $alightingStop !== null) {
            $arrival = Carbon::instance($boardedLeg->arrival_time);
            $distanceToAlighting = $this->geo::distanceMeters(
                $latitude,
                $longitude,
                (float) $alightingStop->latitude,
                (float) $alightingStop->longitude,
            );

            $speedMps = isset($data['speed_mps'])
                ? (float) $data['speed_mps']
                : (isset($data['speed_kph']) ? ((float) $data['speed_kph']) / 3.6 : 0.0);

            // Overshoot: passed alighting stop + distance increasing + speed > 1m/s for 45s => candidate in 120s not 900s
            $isOvershoot = $this->isOvershootCandidate($activeJourney, $alightingStop, $distanceToAlighting, $speedMps, $recordedAt, $arrival);
            $graceSec = $isOvershoot ? self::MISSED_STOP_EARLY_GRACE_SEC : self::MISSED_STOP_GRACE_SEC;

            if ($recordedAt->greaterThan($arrival->copy()->addSeconds($graceSec))
                && $distanceToAlighting > self::MISSED_STOP_DISTANCE_METERS) {

                $advice = $this->formatMissedStopAdvice($activeJourney, $boardedLeg, $alightingStop, $distanceToAlighting);

                return $this->persist($activeJourney, $recordedAt, $latitude, $longitude, [
                    'deviation_type' => 'missed_stop',
                    'severity' => 'medium',
                    'description' => $advice,
                    'expected_stop_id' => $alightingStop->id,
                ]);
            }
        }

        // 2. Off route: distance from the leg polyline corridor.
        $corridorDistance = $this->corridorDistanceMeters($boardedLeg, $latitude, $longitude);
        $tolerance = $this->corridorTolerance($boardedLeg);

        if ($corridorDistance > $tolerance) {
            $severity = $corridorDistance > self::OFF_ROUTE_HIGH_METERS ? 'high' : 'medium';

            return $this->persist($activeJourney, $recordedAt, $latitude, $longitude, [
                'deviation_type' => 'off_route',
                'severity' => $severity,
                'description' => sprintf(
                    'Off route: %.0f m from the corridor of the current %s leg towards %s.',
                    $corridorDistance,
                    $boardedLeg->mode,
                    $alightingStop?->name ?? 'the alighting stop',
                ),
                'expected_stop_id' => $boardedLeg->transit_stop_to_id,
            ]);
        }

        return null;
    }

    /**
     * Detect overshoot: passed alighting stop + distance increasing + speed > 1 m/s => 120s candidate.
     */
    private function isOvershootCandidate(
        ActiveJourney $activeJourney,
        $alightingStop,
        float $currentDistanceToStop,
        float $speedMps,
        Carbon $recordedAt,
        Carbon $arrival
    ): bool {
        if ($recordedAt->lessThanOrEqualTo($arrival->copy()->addSeconds(self::MISSED_STOP_EARLY_GRACE_SEC))) {
            return false;
        }

        if ($speedMps <= 1.0) {
            return false;
        }

        $recent = $activeJourney->journeyProgress()
            ->where('recorded_at', '>=', $recordedAt->copy()->subSeconds(60))
            ->orderByDesc('recorded_at')
            ->take(5)
            ->get();

        if ($recent->isEmpty()) {
            return $currentDistanceToStop > 100.0;
        }

        $earlier = $recent->last();
        $earlierDistance = $this->geo::distanceMeters(
            (float) $earlier->latitude,
            (float) $earlier->longitude,
            (float) $alightingStop->latitude,
            (float) $alightingStop->longitude
        );

        $spanSec = $recordedAt->diffInSeconds(Carbon::parse($earlier->recorded_at));

        return ($currentDistanceToStop >= $earlierDistance) && ($spanSec >= 30 || $currentDistanceToStop > 100.0);
    }

    /**
     * Format bilingual guidance: “انزل الجاية X وامشي Y راجع” + transfer cue.
     */
    private function formatMissedStopAdvice(
        ActiveJourney $activeJourney,
        JourneyLeg $boardedLeg,
        $alightingStop,
        float $distanceToAlighting
    ): string {
        $walkBackMeters = (int) round($distanceToAlighting);
        $nextStopName = $this->findNextStopName($boardedLeg, $alightingStop);

        $transferCueEn = '';
        $transferCueAr = '';

        $subsequentLegs = $activeJourney->journey->journeyLegs
            ->where('sequence', '>', $boardedLeg->sequence)
            ->sortBy('sequence');

        $transitTransfer = $subsequentLegs->first(fn ($l) => in_array($l->mode, ['bus', 'metro', 'minibus', 'microbus', 'rail'], true));
        if ($transitTransfer !== null) {
            $line = $transitTransfer->routeVariant?->route?->short_name ?? $transitTransfer->mode;
            $transferCueEn = " (transfer to Line {$line})";
            $transferCueAr = " (تحويل إلى خط {$line})";
        }

        return sprintf(
            'Missed stop: Alight at next stop %s and walk %dm back to %s%s / انزل الجاية %s وامشي %dm راجع إلى %s%s',
            $nextStopName,
            $walkBackMeters,
            $alightingStop->name,
            $transferCueEn,
            $nextStopName,
            $walkBackMeters,
            $alightingStop->name,
            $transferCueAr
        );
    }

    /**
     * Find next stop along the route variant after the alighting stop.
     */
    private function findNextStopName(JourneyLeg $leg, $alightingStop): string
    {
        if ($leg->routeVariant) {
            $routeStops = $leg->routeVariant->routeStops()->with('transitStop')->orderBy('sequence')->get();
            $currentIdx = $routeStops->search(fn ($rs) => $rs->transit_stop_id === $alightingStop->id);
            if ($currentIdx !== false && isset($routeStops[$currentIdx + 1]) && $routeStops[$currentIdx + 1]->transitStop) {
                return $routeStops[$currentIdx + 1]->transitStop->name;
            }
        }

        return 'المحطة القادمة';
    }

    /**
     * Whether the journey can simply continue after a deviation (resume) or
     * a reroute is required.
     */
    public function canContinue(DeviationEvent $event): bool
    {
        if ($event->deviation_type === 'off_route' && $event->severity === 'high') {
            return false;
        }

        return true;
    }

    /**
     * The transit leg the user is currently riding: the first transit leg
     * with a stop event at its boarding stop but none at its alighting stop,
     * based on the recorded progress history.
     */
    private function boardedLeg(ActiveJourney $activeJourney): ?JourneyLeg
    {
        $legs = $activeJourney->journey->journeyLegs
            ->sortBy('sequence')
            ->filter(fn (JourneyLeg $leg) => $leg->transit_stop_from_id !== null && $leg->transit_stop_to_id !== null)
            ->values();

        if ($legs->isEmpty()) {
            return null;
        }

        $stopEventStopIds = $this->stopEventStopIds($activeJourney);

        foreach ($legs as $leg) {
            $boarded = in_array($leg->transit_stop_from_id, $stopEventStopIds, true);
            $alighted = in_array($leg->transit_stop_to_id, $stopEventStopIds, true);

            if ($boarded && !$alighted) {
                return $leg;
            }
        }

        return null;
    }

    /**
     * Stop ids at which any recorded progress update was a stop event.
     */
    private function stopEventStopIds(ActiveJourney $activeJourney): array
    {
        return $activeJourney->journeyProgress()
            ->where('is_stop_event', true)
            ->whereNotNull('nearest_stop_id')
            ->pluck('nearest_stop_id')
            ->unique()
            ->values()
            ->all();
    }

    private function persist(ActiveJourney $activeJourney, Carbon $recordedAt, float $latitude, float $longitude, array $attributes): DeviationEvent
    {
        $event = DeviationEvent::create(array_merge([
            'active_journey_id' => $activeJourney->id,
            'occurred_at' => $recordedAt,
            'latitude' => $latitude,
            'longitude' => $longitude,
        ], $attributes));

        $activeJourney->update([
            'status' => 'deviated',
            'deviation_detected_at' => $recordedAt,
        ]);

        $this->notifications->send($activeJourney->user_id, 'journey_deviation', [
            'active_journey_id' => $activeJourney->id,
            'journey_id' => $activeJourney->journey_id,
            'deviation_event_id' => $event->id,
            'deviation_type' => $event->deviation_type,
            // Human-readable label for the notification body.
            'label' => $event->deviation_type === 'off_route' ? 'off-route' : 'missed-stop',
            'severity' => $event->severity,
        ]);

        return $event;
    }
}
