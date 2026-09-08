<?php

namespace App\Services\Journey;

use App\Models\ActiveJourney;
use App\Models\Journey;
use App\Models\JourneyProgress;
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

        $progress = JourneyProgress::create([
            'active_journey_id' => $activeJourney->id,
            'recorded_at' => $recordedAt,
            'latitude' => $latitude,
            'longitude' => $longitude,
            'speed_kph' => $data['speed_kph'] ?? null,
            'bearing_deg' => $data['bearing_deg'] ?? null,
            'accuracy_meters' => $data['accuracy_meters'] ?? null,
            'nearest_stop_id' => $nearest['stop']?->id,
            'nearest_stop_distance_meters' => $nearest['stop'] !== null ? round($nearest['distance'], 3) : null,
            'is_stop_event' => $nearest['stop'] !== null && $nearest['distance'] <= self::STOP_EVENT_RADIUS_METERS,
        ]);

        // Deviation detection only runs while the journey is moving along its
        // plan; while 'deviated' the existing event stands.
        $deviationEvent = null;
        if (!$wasDeviated) {
            $deviationEvent = $this->deviations->detect($activeJourney, $recordedAt, $latitude, $longitude, $nearest);
        }

        $currentLegIndex = $this->resolveCurrentLegIndex($legs, $latitude, $longitude, $activeJourney->current_leg_index);
        $percent = $this->progressPercent($journey, $activeJourney, $recordedAt);

        $activeJourney->update([
            'current_leg_index' => $currentLegIndex,
            'current_progress_percent' => $percent,
        ]);

        $activeJourney->refresh();

        return [
            'active_journey' => $activeJourney,
            'progress' => $progress,
            'deviation_event' => $deviationEvent,
            'tracking' => $this->trackingState($activeJourney, $nearest, $currentLegIndex, $percent),
        ];
    }

    /**
     * Compute the tracking state without recording a new location update.
     */
    public function currentState(ActiveJourney $activeJourney): array
    {
        $journey = $activeJourney->journey()->with('journeyLegs')->firstOrFail();
        $legs = $journey->journeyLegs->sortBy('sequence')->values();

        $latest = $activeJourney->journeyProgress()->orderByDesc('recorded_at')->orderByDesc('id')->first();

        $nearest = ['stop' => null, 'distance' => null];
        if ($latest && $latest->nearest_stop_id) {
            $stop = TransitStop::find($latest->nearest_stop_id);
            $nearest = [
                'stop' => $stop,
                'distance' => $stop !== null
                    ? $this->geo::distanceMeters((float) $latest->latitude, (float) $latest->longitude, (float) $stop->latitude, (float) $stop->longitude)
                    : null,
            ];
        }

        return $this->trackingState($activeJourney, $nearest, $activeJourney->current_leg_index, (float) $activeJourney->current_progress_percent);
    }

    /**
     * Tracking state: current leg, next stop and stop-event flag.
     */
    private function trackingState(ActiveJourney $activeJourney, array $nearest, int $currentLegIndex, float $percent): array
    {
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
     * Deviation context for a deviated journey: the latest event and whether
     * the journey can continue without rerouting.
     */
    private function deviationState(ActiveJourney $activeJourney): ?array
    {
        if ($activeJourney->status !== 'deviated') {
            return null;
        }

        $event = $activeJourney->deviationEvents()
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->first();

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
