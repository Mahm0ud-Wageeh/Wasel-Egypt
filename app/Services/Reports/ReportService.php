<?php

namespace App\Services\Reports;

use App\Models\AuditLog;
use App\Models\CommunityReport;
use App\Models\ReportModeration;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Community report creation and moderation.
 *
 * Report status lifecycle (deterministic):
 *
 *   pending --verify-->  verified   --resolve-->  resolved
 *   pending --reject-->  rejected
 *
 * 'rejected' and 'resolved' are terminal. Only verified reports (or resolved
 * ones, which were verified first) are exposed publicly.
 *
 * Every action writes a report_moderations row (the moderation history) and
 * an audit_logs entry.
 */
class ReportService
{
    /** Duplicate window: identical reports by the same author are rejected. */
    public const DUPLICATE_WINDOW_HOURS = 24;

    /** Maximum reports per user inside the spam window. */
    public const SPAM_WINDOW_MINUTES = 60;
    public const SPAM_MAX_REPORTS = 5;

    public function __construct(
        private TrustScoreService $trust,
        private NotificationService $notifications,
        private \App\Repositories\Contracts\CommunityReportRepositoryInterface $reports,
    )
    {
    }

    /**
     * Create a community report after duplicate/spam guards.
     */
    public function create(User $user, array $data): CommunityReport
    {
        $this->assertNotSpamming($user);
        $this->assertNotDuplicate($user, $data);

        return DB::transaction(function () use ($user, $data) {
            $report = CommunityReport::create(array_merge($data, [
                'user_id' => $user->id,
                'status' => 'pending',
                'occurred_at' => $data['occurred_at'] ?? now(),
            ]));

            $this->audit($user, 'report.created', $report->id, [
                'report_type' => $report->report_type,
                'status' => 'pending',
            ]);

            return $report;
        });
    }

    /**
     * Apply a moderation action with status transition guards.
     *
     * @return array [CommunityReport, ReportModeration]
     */
    public function moderate(User $moderator, CommunityReport $report, string $action, ?string $notes = null): array
    {
        if ($moderator->id === $report->user_id) {
            throw new InvalidArgumentException('Moderators cannot moderate their own reports.');
        }

        $transitions = [
            'verify' => ['from' => 'pending', 'to' => 'verified'],
            'reject' => ['from' => 'pending', 'to' => 'rejected'],
            'resolve' => ['from' => 'verified', 'to' => 'resolved'],
        ];

        if (!isset($transitions[$action])) {
            throw new InvalidArgumentException("Unknown moderation action '{$action}'.");
        }

        $transition = $transitions[$action];

        if ($report->status !== $transition['from']) {
            throw new InvalidArgumentException(
                "A '{$action}' requires the report to be '{$transition['from']}'; it is '{$report->status}'."
            );
        }

        return DB::transaction(function () use ($moderator, $report, $action, $notes, $transition) {
            $report->update(['status' => $transition['to']]);

            $moderation = ReportModeration::create([
                'community_report_id' => $report->id,
                'moderator_id' => $moderator->id,
                'action_taken' => $action,
                'notes' => $notes,
            ]);

            $this->audit($moderator, 'report.'.$action, $report->id, [
                'from' => $transition['from'],
                'to' => $transition['to'],
                'notes' => $notes,
            ]);

            // Notify the report author about the moderation outcome.
            $notificationTypes = [
                'verify' => 'report_verified',
                'reject' => 'report_rejected',
                'resolve' => 'report_resolved',
            ];
            $this->notifications->send($report->user_id, $notificationTypes[$action], [
                'community_report_id' => $report->id,
            ]);

            return [$report->refresh(), $moderation];
        });
    }

    /**
     * Whether the report is exposed on the public endpoints.
     */
    public function isPublic(CommunityReport $report): bool
    {
        return in_array($report->status, ['verified', 'resolved'], true);
    }

    /**
     * Reject identical reports by the same author within the duplicate window.
     */
    private function assertNotDuplicate(User $user, array $data): void
    {
        if ($this->reports->duplicateWithinWindow($user->id, $data, self::DUPLICATE_WINDOW_HOURS)) {
            throw new InvalidArgumentException('An identical report was already submitted within the last 24 hours.');
        }
    }

    /**
     * Basic spam guard: limit reports per user per hour.
     */
    private function assertNotSpamming(User $user): void
    {
        $recent = $this->reports->recentCountForUser($user->id, self::SPAM_WINDOW_MINUTES);

        if ($recent >= self::SPAM_MAX_REPORTS) {
            throw new InvalidArgumentException('Too many reports submitted in a short period. Please try again later.');
        }
    }

    private function audit(User $user, string $action, int $reportId, array $changes): void
    {
        AuditLog::create([
            'user_id' => $user->id,
            'action' => $action,
            'resource_type' => 'community_report',
            'resource_id' => $reportId,
            'changes' => $changes,
            'occurred_at' => now(),
        ]);
    }
}
