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
    public const OFF_ROUTE_THRESHOLD_METERS = 250;
    public const OFF_ROUTE_HIGH_METERS = 1000;
    public const MISSED_STOP_GRACE_SEC = 900;
    public const MISSED_STOP_DISTANCE_METERS = 250;

    public function __construct(private GeoCalculator $geo, private NotificationService $notifications)
    {
    }

    /**
     * Evaluate one location update against the journey plan.
     *
     * @param array $context Result of the tracking computation:
     *                       ['nearest_stop' => TransitStop|null, 'nearest_distance' => float|null].
     * @return DeviationEvent|null The persisted deviation event, if one fired.
     */
    public function detect(ActiveJourney $activeJourney, Carbon $recordedAt, float $latitude, float $longitude, array $context): ?DeviationEvent
    {
        if (!in_array($activeJourney->status, ['active', 'rerouted'], true)) {
            return null;
        }

        $boardedLeg = $this->boardedLeg($activeJourney);

        if ($boardedLeg === null) {
            return null;
        }

        $alightingStop = $boardedLeg->transitStopTo;

        // 1. Off route: distance from the leg corridor.
        $corridorDistance = $this->geo::pointToSegmentDistanceMeters(
            $latitude,
            $longitude,
            (float) $boardedLeg->from_lat,
            (float) $boardedLeg->from_lng,
            (float) $boardedLeg->to_lat,
            (float) $boardedLeg->to_lng,
        );

        if ($corridorDistance > self::OFF_ROUTE_THRESHOLD_METERS) {
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

        // 2. Missed stop: planned arrival passed by more than the grace period
        //    while still not near the alighting stop.
        if ($boardedLeg->arrival_time !== null && $alightingStop !== null) {
            $arrival = Carbon::instance($boardedLeg->arrival_time);
            $distanceToAlighting = $this->geo::distanceMeters(
                $latitude,
                $longitude,
                (float) $alightingStop->latitude,
                (float) $alightingStop->longitude,
            );

            if ($recordedAt->greaterThan($arrival->copy()->addSeconds(self::MISSED_STOP_GRACE_SEC))
                && $distanceToAlighting > self::MISSED_STOP_DISTANCE_METERS) {
                return $this->persist($activeJourney, $recordedAt, $latitude, $longitude, [
                    'deviation_type' => 'missed_stop',
                    'severity' => 'medium',
                    'description' => sprintf(
                        'Missed stop: planned arrival at %s was %d minutes ago.',
                        $alightingStop->name,
                        (int) round($recordedAt->diffInMinutes($arrival)),
                    ),
                    'expected_stop_id' => $alightingStop->id,
                ]);
            }
        }

        return null;
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
