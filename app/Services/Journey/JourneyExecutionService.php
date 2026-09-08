<?php

namespace App\Services\Journey;

use App\Models\ActiveJourney;
use App\Models\Journey;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Lifecycle of an active journey (deterministic state machine):
 *
 *   (none)    --start-->             active
 *   active    --deviation-->         deviated   (via DeviationDetectionService)
 *   deviated  --resume-->            active     (only when the journey can continue)
 *   deviated  --accept recovery-->   rerouted   (continues on a new plan)
 *   rerouted  --deviation-->         deviated
 *   {active, deviated, rerouted} --complete--> completed (terminal)
 *   {active, deviated, rerouted} --cancel-->   cancelled (terminal)
 */
class JourneyExecutionService
{
    /** A user may only have one journey in flight at a time. */
    public const MAX_ACTIVE_JOURNEYS_PER_USER = 1;

    /** States from which the journey can still be tracked and finished. */
    public const MUTABLE_STATUSES = ['active', 'deviated', 'rerouted'];

    public function __construct(private NotificationService $notifications)
    {
    }

    public function start(User $user, Journey $journey, ?string $startedAt = null): ActiveJourney
    {
        if (!in_array($journey->status, ['planned', 'saved'], true)) {
            throw new InvalidArgumentException("A journey with status '{$journey->status}' cannot be started.");
        }

        if ($journey->user_id !== $user->id) {
            throw new InvalidArgumentException('Only the journey owner can start it.');
        }

        if ($journey->journeyLegs()->count() === 0) {
            throw new InvalidArgumentException('The journey has no legs and cannot be started.');
        }

        $activeCount = ActiveJourney::where('user_id', $user->id)
            ->where('status', 'active')
            ->count();

        if ($activeCount >= self::MAX_ACTIVE_JOURNEYS_PER_USER) {
            throw new InvalidArgumentException('You already have an active journey. Complete or cancel it first.');
        }

        return DB::transaction(function () use ($user, $journey, $startedAt) {
            $activeJourney = ActiveJourney::create([
                'journey_id' => $journey->id,
                'user_id' => $user->id,
                'started_at' => $startedAt ?? now(),
                'current_leg_index' => 0,
                'current_progress_percent' => 0,
                'status' => 'active',
            ]);

            $this->notifications->send($user->id, 'journey_started', [
                'journey_id' => $journey->id,
                'active_journey_id' => $activeJourney->id,
            ]);

            return $activeJourney;
        });
    }

    public function complete(ActiveJourney $activeJourney): ActiveJourney
    {
        $this->assertMutable($activeJourney);

        $activeJourney->update([
            'status' => 'completed',
            'ended_at' => now(),
            'current_progress_percent' => 100,
            'current_leg_index' => max(0, $activeJourney->journey->journeyLegs()->count() - 1),
        ]);

        $this->notifications->send($activeJourney->user_id, 'journey_completed', [
            'journey_id' => $activeJourney->journey_id,
            'active_journey_id' => $activeJourney->id,
            'duration' => (int) round(($activeJourney->ended_at->getTimestamp() - $activeJourney->started_at->getTimestamp()) / 60),
        ]);

        return $activeJourney->refresh();
    }

    public function cancel(ActiveJourney $activeJourney): ActiveJourney
    {
        $this->assertMutable($activeJourney);

        $activeJourney->update([
            'status' => 'cancelled',
            'ended_at' => now(),
        ]);

        $this->notifications->send($activeJourney->user_id, 'journey_cancelled', [
            'journey_id' => $activeJourney->journey_id,
            'active_journey_id' => $activeJourney->id,
        ]);

        return $activeJourney->refresh();
    }

    /**
     * Resume a deviated journey without rerouting. Only allowed when the
     * deviation is minor enough for the journey to continue.
     */
    public function resume(ActiveJourney $activeJourney, bool $canContinue): ActiveJourney
    {
        if ($activeJourney->status !== 'deviated') {
            throw new InvalidArgumentException("Only a deviated journey can be resumed; this one is '{$activeJourney->status}'.");
        }

        if (!$canContinue) {
            throw new InvalidArgumentException('This deviation is too severe to continue; select a recovery option instead.');
        }

        $activeJourney->update(['status' => 'active']);

        return $activeJourney->refresh();
    }

    /**
     * Terminal states guard: only in-flight journeys can be finished.
     */
    public function assertMutable(ActiveJourney $activeJourney): void
    {
        if (!in_array($activeJourney->status, self::MUTABLE_STATUSES, true)) {
            throw new InvalidArgumentException("Only an in-flight journey can be updated; this one is '{$activeJourney->status}'.");
        }
    }
}
