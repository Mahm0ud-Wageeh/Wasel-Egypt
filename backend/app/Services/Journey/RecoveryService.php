<?php

namespace App\Services\Journey;

use App\Models\ActiveJourney;
use App\Models\DeviationEvent;
use App\Models\RecoveryRoute;
use App\Services\Notifications\NotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Generates and applies recovery options for a deviated active journey.
 *
 * Options are planned with the existing JourneyPlannerService from the
 * deviation point to the original destination, persisted as alternative
 * Journey rows (so the original journey history stays intact) and linked to
 * the deviation event through recovery_routes rows.
 */
class RecoveryService
{
    public const MAX_OPTIONS = 3;

    /** Widened boarding walk radius for recovery replanning. */
    public const RECOVERY_WALK_METERS = 2000;

    public function __construct(
        private JourneyPlannerService $planner,
        private JourneyService $journeys,
        private NotificationService $notifications,
    ) {
    }

    /**
     * Generate recovery options for the active deviation event.
     * Previously generated, not-yet-accepted options are replaced.
     *
     * @return RecoveryRoute[] Sorted by estimated delay (best first).
     */
    public function generateOptions(ActiveJourney $activeJourney, DeviationEvent $event, int $maxOptions = self::MAX_OPTIONS): array
    {
        if ($activeJourney->status !== 'deviated') {
            throw new InvalidArgumentException('Recovery options can only be generated for a deviated journey.');
        }

        if ($event->active_journey_id !== $activeJourney->id) {
            throw new InvalidArgumentException('The deviation event does not belong to this active journey.');
        }

        // Replace stale, unaccepted options deterministically.
        RecoveryRoute::where('deviation_event_id', $event->id)
            ->whereNull('accepted_at')
            ->delete();

        $journey = $activeJourney->journey;
        $occurredAt = Carbon::instance($event->occurred_at);

        $plans = $this->planner->plan(
            (float) $event->latitude,
            (float) $event->longitude,
            (float) $journey->destination_lat,
            (float) $journey->destination_lng,
            $activeJourney->user->preferences()->first(),
            $occurredAt,
            min(max(1, $maxOptions), self::MAX_OPTIONS),
            // Recovery widens the access/egress walk radius: a rider who
            // deviated far from the corridor is demonstrably willing to walk
            // further to rejoin the network than a fresh-search rider.
            ['max_walk_distance_per_leg' => self::RECOVERY_WALK_METERS],
        );

        // Recovery replaces an in-progress TRANSIT journey: a walking-only
        // alternative is only acceptable when no transit option exists at
        // all — the rider was mid-ride and expects to rejoin the network.
        $transitPlans = array_values(array_filter(
            $plans,
            fn (array $plan) => collect($plan['legs'] ?? [])->contains(fn ($leg) => ($leg['type'] ?? null) === 'transit')
        ));
        if ($transitPlans !== []) {
            $plans = $transitPlans;
        }

        $remainingOriginalSec = $this->remainingOriginalSeconds($journey, $activeJourney, $occurredAt);

        // Alternative journeys and their recovery links are created atomically:
        // a mid-generation failure must not leave a partial option set.
        $options = DB::transaction(function () use ($activeJourney, $event, $occurredAt, $plans, $remainingOriginalSec) {
            $options = [];
            foreach ($plans as $plan) {
                $alternative = $this->journeys->createFromPlan($activeJourney->user, $plan, [
                    'origin_lat' => $event->latitude,
                    'origin_lng' => $event->longitude,
                    'destination_lat' => $activeJourney->journey->destination_lat,
                    'destination_lng' => $activeJourney->journey->destination_lng,
                    'requested_at' => $occurredAt,
                ]);

                $options[] = RecoveryRoute::create([
                    'deviation_event_id' => $event->id,
                    'alternative_journey_id' => $alternative->id,
                    'estimated_delay_sec' => max(0, $plan['total_duration_sec'] - $remainingOriginalSec),
                    'generated_at' => $occurredAt,
                ]);
            }

            return $options;
        });

        usort($options, fn (RecoveryRoute $a, RecoveryRoute $b)
            => [$a->estimated_delay_sec, $a->id] <=> [$b->estimated_delay_sec, $b->id]);

        // One notification per deviation event, even if options are regenerated.
        $this->notifications->send($activeJourney->user_id, 'recovery_options_ready', [
            'active_journey_id' => $activeJourney->id,
            'deviation_event_id' => $event->id,
            'count' => count($options),
        ], dedupeKey: 'recovery_options:'.$event->id);

        return $options;
    }

    /**
     * Accept a recovery option: the active journey continues on the
     * alternative journey and enters the 'rerouted' state.
     */
    public function accept(ActiveJourney $activeJourney, RecoveryRoute $recoveryRoute): ActiveJourney
    {
        if ($activeJourney->status !== 'deviated') {
            throw new InvalidArgumentException('Only a deviated journey can be rerouted.');
        }

        if ($recoveryRoute->accepted_at !== null) {
            throw new InvalidArgumentException('This recovery option was already accepted.');
        }

        if ($recoveryRoute->deviationEvent->active_journey_id !== $activeJourney->id) {
            throw new InvalidArgumentException('The recovery option does not belong to this active journey.');
        }

        $recoveryRoute->update(['accepted_at' => now()]);

        $activeJourney->update([
            'journey_id' => $recoveryRoute->alternative_journey_id,
            'status' => 'rerouted',
            'current_leg_index' => 0,
            'current_progress_percent' => 0,
        ]);

        $this->notifications->send($activeJourney->user_id, 'journey_rerouted', [
            'active_journey_id' => $activeJourney->id,
            'journey_id' => $recoveryRoute->alternative_journey_id,
            'recovery_route_id' => $recoveryRoute->id,
        ]);

        return $activeJourney->refresh();
    }

    /**
     * Remaining planned time of the original journey at the deviation time.
     */
    private function remainingOriginalSeconds($journey, ActiveJourney $activeJourney, Carbon $occurredAt): int
    {
        $total = (int) $journey->total_duration_sec;

        if ($total <= 0) {
            return 0;
        }

        $elapsed = max(0, $occurredAt->getTimestamp() - $activeJourney->started_at->getTimestamp());
        $ratio = min(1.0, $elapsed / $total);

        return (int) round($total * (1.0 - $ratio));
    }
}
