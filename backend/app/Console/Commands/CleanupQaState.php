<?php

namespace App\Console\Commands;

use App\Models\DeviationEvent;
use App\Models\Journey;
use App\Models\Notification;
use App\Models\RecoveryRoute;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Remove development/QA test state from a database before release.
 *
 * Only artifacts that are demonstrably test-generated are touched:
 *  - users whose email matches known QA/E2E patterns (qa*, e2e*, final*,
 *    ui*, prod*, qaprobe*, qamule*, tfc2-*, audit.tester*, frontend@test,
 *    amr.test@*, tester@wasel.eg, *@mailinator.com, *@example.com) — never
 *    the seeded admin (admin@example.com is explicitly excluded) or any
 *    other real account.
 *  - journeys, active journeys, progress, deviations, recovery routes,
 *    notifications and owned rows of those users.
 *
 * Legitimate user data is never deleted: the command never touches users
 * outside the QA patterns, and it never touches transit reference data.
 * Runs with --dry-run to preview what would be removed.
 */
class CleanupQaState extends Command
{
    protected $signature = 'wasel:cleanup-qa-state
        {--dry-run : Report what would be removed without deleting}
        {--force : Skip the interactive confirmation}';

    protected $description = 'Remove confirmed QA/E2E test users and their journey artifacts (never real users or transit data)';

    /** Email patterns that identify test accounts. admin@example.com is NOT matched (anchored prefixes don't include it). */
    private const QA_EMAIL_PATTERNS = [
        '/^(qa|e2e|final|ui|prod|qaprobe|qamule|tfc2)[-a-z0-9]*@/i',
        '/^audit\.tester@/i',
        '/^frontend@test\.com$/i',
        '/^amr\.test@/i',
        '/^sara@test\.com$/i', // original auth-flow demo account (manual E2E era)
        '/^tester@wasel\.eg$/i',
        '/@(mailinator|example)\.com$/i',
    ];

    public function handle(): int
    {
        $users = User::get(['id', 'email', 'name']);

        // The seeded admin is never a QA artifact, whatever its domain.
        $qaUsers = $users->filter(fn ($u) => $u->email !== 'admin@example.com' && $this->isQaAccount($u->email));
        $kept = $users->diff($qaUsers);

        $this->info('QA/test accounts identified: '.$qaUsers->count().' of '.$users->count().' users.');

        if ($qaUsers->isEmpty()) {
            $this->line('Nothing to clean — no test accounts found.');

            return self::SUCCESS;
        }

        $qaIds = $qaUsers->pluck('id')->all();

        $journeyIds = Journey::whereIn('user_id', $qaIds)->pluck('id')->all();
        $activeJourneyIds = DB::table('active_journeys')->whereIn('user_id', $qaIds)->pluck('id')->all();
        $deviationIds = DeviationEvent::whereIn('active_journey_id', $activeJourneyIds)->pluck('id')->all();

        $counts = [
            'users' => count($qaIds),
            'journeys' => count($journeyIds),
            'active_journeys' => count($activeJourneyIds),
            'deviation_events' => count($deviationIds),
            'recovery_routes' => RecoveryRoute::whereIn('deviation_event_id', $deviationIds)->count(),
            'journey_progress' => DB::table('journey_progress')->whereIn('active_journey_id', $activeJourneyIds)->count(),
            'journey_legs' => DB::table('journey_legs')->whereIn('journey_id', $journeyIds)->count(),
            'transfers' => DB::table('transfers')->whereIn('journey_id', $journeyIds)->count(),
            'notifications' => Notification::whereIn('user_id', $qaIds)->count(),
            'saved_trips' => DB::table('saved_trips')->whereIn('user_id', $qaIds)->count(),
            'favorite_locations' => DB::table('favorite_locations')->whereIn('user_id', $qaIds)->count(),
            'analytics_events' => DB::table('analytics_events')->whereIn('user_id', $qaIds)->count(),
            'community_reports' => DB::table('community_reports')->whereIn('user_id', $qaIds)->count(),
        ];

        $this->table(['Artifact', 'Count'], collect($counts)->map(fn ($c, $k) => [$k, $c])->values()->all());
        $this->line('Users kept (seeded/real): '.implode(', ', $kept->pluck('email')->all()));

        if ($this->option('dry-run')) {
            $this->info('Dry run — nothing was deleted.');

            return self::SUCCESS;
        }

        if (!$this->option('force') && !$this->confirm('Delete these QA artifacts permanently?')) {
            $this->line('Aborted.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($qaIds, $journeyIds, $activeJourneyIds, $deviationIds) {
            // Children first, then journeys, then the users themselves.
            RecoveryRoute::whereIn('deviation_event_id', $deviationIds)->delete();
            DeviationEvent::whereIn('active_journey_id', $activeJourneyIds)->delete();
            DB::table('journey_progress')->whereIn('active_journey_id', $activeJourneyIds)->delete();
            DB::table('active_journeys')->whereIn('user_id', $qaIds)->delete();

            DB::table('transfers')->whereIn('journey_id', $journeyIds)->delete();
            DB::table('journey_legs')->whereIn('journey_id', $journeyIds)->delete();
            Journey::whereIn('user_id', $qaIds)->delete();

            DB::table('saved_trips')->whereIn('user_id', $qaIds)->delete();
            DB::table('favorite_locations')->whereIn('user_id', $qaIds)->delete();
            DB::table('analytics_events')->whereIn('user_id', $qaIds)->delete();
            DB::table('community_reports')->whereIn('user_id', $qaIds)->delete();
            DB::table('notification_preferences')->whereIn('user_id', $qaIds)->delete();
            DB::table('user_preferences')->whereIn('user_id', $qaIds)->delete();
            DB::table('user_roles')->whereIn('user_id', $qaIds)->delete();
            Notification::whereIn('user_id', $qaIds)->delete();

            // Sanctum tokens of the deleted users (before the users, so the
            // tokenable rows are cleaned deterministically).
            DB::table('personal_access_tokens')
                ->where('tokenable_type', 'App\\Models\\User')
                ->whereIn('tokenable_id', $qaIds)->delete();
            User::whereIn('id', $qaIds)->forceDelete();
        });

        $this->info('QA state removed; seeded baseline and real users kept.');

        return self::SUCCESS;
    }

    private function isQaAccount(string $email): bool
    {
        foreach (self::QA_EMAIL_PATTERNS as $pattern) {
            if (preg_match($pattern, $email) === 1) {
                return true;
            }
        }

        return false;
    }
}
