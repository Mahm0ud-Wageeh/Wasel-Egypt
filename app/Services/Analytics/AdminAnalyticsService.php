<?php

namespace App\Services\Analytics;

use App\Models\ActiveJourney;
use App\Models\CommunityReport;
use App\Models\DeviationEvent;
use App\Models\Journey;
use App\Models\JourneyLeg;
use App\Models\Notification;
use App\Models\RecoveryRoute;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use App\Services\Reports\TrustScoreService;
use Illuminate\Support\Facades\DB;

/**
 * Admin dashboard analytics.
 *
 * All metrics are deterministic and computed with SQL aggregations
 * (COUNT/SUM/AVG + GROUP BY) — datasets are never loaded into PHP except
 * for bounded per-user trust bucketing.
 *
 * Date filters are inclusive on both ends and applied to each metric's
 * natural timestamp (journeys.created_at, active_journeys.started_at,
 * deviation_events.occurred_at, community_reports.created_at,
 * notifications.sent_at, analytics_events.occurred_at).
 */
class AdminAnalyticsService
{
    public function __construct(private TrustScoreService $trust)
    {
    }

    /**
     * High-level dashboard totals.
     */
    public function dashboard(?string $from = null, ?string $to = null): array
    {
        $journeys = $this->journeys($from, $to);
        $reports = $this->reports($from, $to);
        $trust = $this->trust($from, $to);

        return [
            'period' => $this->period($from, $to),
            'totals' => [
                'users' => User::count(),
                'journeys_created' => (int) ($journeys['totals']['created'] ?? 0),
                'active_journeys_in_flight' => ActiveJourney::where('status', 'active')->count(),
                'journey_searches' => $this->eventCount('journey_search', $from, $to),
                'deviations' => $this->deviations($from, $to)['totals']['deviations'],
                'community_reports' => $reports['totals']['reports'],
                'pending_reports' => $reports['by_status']['pending'] ?? 0,
                'notifications_sent' => $this->notifications($from, $to)['totals']['notifications'],
            ],
            'journey_completion_rate' => $journeys['completion_rate'],
            'journey_cancellation_rate' => $journeys['cancellation_rate'],
            'report_approval_rate' => $reports['approval_rate'],
            'average_user_trust_score' => $trust['average_score'],
        ];
    }

    /**
     * Journey execution metrics: completion/cancellation rates and volume.
     */
    public function journeys(?string $from = null, ?string $to = null): array
    {
        $statusCounts = $this->statusCounts($from, $to);

        $completed = (int) ($statusCounts['completed'] ?? 0);
        $cancelled = (int) ($statusCounts['cancelled'] ?? 0);
        $terminal = $completed + $cancelled;

        $totals = DB::table('journeys')
            ->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('created_at', '<=', $to))
            ->selectRaw('COUNT(*) as created, COALESCE(AVG(total_duration_sec), 0) as avg_duration, COALESCE(AVG(score), 0) as avg_score')
            ->first();

        return [
            'period' => $this->period($from, $to),
            'totals' => [
                'created' => (int) $totals->created,
                'active_journeys' => (int) ($statusCounts['active'] ?? 0)
                    + (int) ($statusCounts['deviated'] ?? 0)
                    + (int) ($statusCounts['rerouted'] ?? 0),
                'completed' => $completed,
                'cancelled' => $cancelled,
                'deviated' => (int) ($statusCounts['deviated'] ?? 0),
                'rerouted' => (int) ($statusCounts['rerouted'] ?? 0),
            ],
            'avg_planned_duration_sec' => round((float) $totals->avg_duration, 2),
            'avg_score' => round((float) $totals->avg_score, 4),
            'completion_rate' => $this->rate($completed, $terminal),
            'cancellation_rate' => $this->rate($cancelled, $terminal),
            'created_per_day' => $this->dailySeries('journeys', 'created_at', $from, $to),
        ];
    }

    /**
     * Deviation and recovery statistics.
     */
    public function deviations(?string $from = null, ?string $to = null): array
    {
        $byType = DeviationEvent::query()
            ->when($from, fn ($q) => $q->whereDate('occurred_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('occurred_at', '<=', $to))
            ->groupBy('deviation_type')
            ->selectRaw('deviation_type, COUNT(*) as cnt')
            ->pluck('cnt', 'deviation_type');

        $bySeverity = DeviationEvent::query()
            ->when($from, fn ($q) => $q->whereDate('occurred_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('occurred_at', '<=', $to))
            ->groupBy('severity')
            ->selectRaw('severity, COUNT(*) as cnt')
            ->pluck('cnt', 'severity');

        $total = (int) $byType->sum();

        $recovery = RecoveryRoute::query()
            ->whereHas('deviationEvent', function ($q) use ($from, $to) {
                $q->when($from, fn ($q2) => $q2->whereDate('occurred_at', '>=', $from))
                    ->when($to, fn ($q2) => $q2->whereDate('occurred_at', '<=', $to));
            })
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN accepted_at IS NOT NULL THEN 1 ELSE 0 END) as accepted, COALESCE(AVG(estimated_delay_sec), 0) as avg_delay')
            ->first();

        $accepted = (int) ($recovery->accepted ?? 0);
        $recoveryTotal = (int) ($recovery->total ?? 0);

        return [
            'period' => $this->period($from, $to),
            'totals' => [
                'deviations' => $total,
                'recovery_options_generated' => $recoveryTotal,
                'recovery_options_accepted' => $accepted,
            ],
            'by_type' => $byType->toArray(),
            'by_severity' => $bySeverity->toArray(),
            'recovery_acceptance_rate' => $this->rate($accepted, $recoveryTotal),
            'avg_estimated_delay_sec' => round((float) ($recovery->avg_delay ?? 0), 2),
        ];
    }

    /**
     * Route/search usage statistics from the analytics_events stream.
     */
    public function usage(?string $from = null, ?string $to = null): array
    {
        $searches = $this->eventCount('journey_search', $from, $to);
        $created = $this->eventCount('journey_created', $from, $to);

        return [
            'period' => $this->period($from, $to),
            'totals' => [
                'journey_searches' => $searches,
                'journeys_saved' => $created,
            ],
            'search_to_saved_conversion_rate' => $this->rate($created, $searches),
            'searches_per_day' => $this->dailySeries('analytics_events', 'occurred_at', $from, $to, 'journey_search'),
            'created_per_day' => $this->dailySeries('analytics_events', 'occurred_at', $from, $to, 'journey_created'),
        ];
    }

    /**
     * Community report statistics.
     */
    public function reports(?string $from = null, ?string $to = null): array
    {
        $byStatus = CommunityReport::query()
            ->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('created_at', '<=', $to))
            ->groupBy('status')
            ->selectRaw('status, COUNT(*) as cnt')
            ->pluck('cnt', 'status');

        $byType = CommunityReport::query()
            ->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('created_at', '<=', $to))
            ->groupBy('report_type')
            ->selectRaw('report_type, COUNT(*) as cnt')
            ->pluck('cnt', 'report_type');

        $total = (int) $byStatus->sum();
        $approved = (int) ($byStatus['verified'] ?? 0) + (int) ($byStatus['resolved'] ?? 0);

        $moderations = DB::table('report_moderations')
            ->join('community_reports', 'community_reports.id', '=', 'report_moderations.community_report_id')
            ->when($from, fn ($q) => $q->whereDate('community_reports.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('community_reports.created_at', '<=', $to))
            ->selectRaw('COUNT(*) as actions, COUNT(DISTINCT report_moderations.moderator_id) as moderators, COUNT(DISTINCT report_moderations.community_report_id) as moderated_reports')
            ->first();

        return [
            'period' => $this->period($from, $to),
            'totals' => [
                'reports' => $total,
                'moderation_actions' => (int) ($moderations->actions ?? 0),
                'active_moderators' => (int) ($moderations->moderators ?? 0),
            ],
            'by_status' => $byStatus->toArray(),
            'by_type' => $byType->toArray(),
            'approval_rate' => $this->rate($approved, $total),
            'avg_moderations_per_moderated_report' => (int) ($moderations->moderated_reports ?? 0) > 0
                ? round((int) ($moderations->actions ?? 0) / (int) $moderations->moderated_reports, 2)
                : 0.0,
        ];
    }

    /**
     * Trust score statistics: average and level distribution across users.
     */
    public function trust(?string $from = null, ?string $to = null): array
    {
        // One grouped aggregation; bucketing is bounded by the user count.
        $rows = DB::table('users')
            ->leftJoin('community_reports', 'community_reports.user_id', '=', 'users.id')
            ->groupBy('users.id')
            ->selectRaw('users.id as uid, '
                .'COALESCE(SUM(CASE WHEN community_reports.status IN (\'verified\', \'resolved\') THEN 1 ELSE 0 END), 0) as verified, '
                .'COALESCE(SUM(CASE WHEN community_reports.status = \'rejected\' THEN 1 ELSE 0 END), 0) as rejected')
            ->get();

        $levels = ['trusted' => 0, 'standard' => 0, 'low' => 0];
        $scoreSum = 0;

        foreach ($rows as $row) {
            $score = max(0, min(100,
                TrustScoreService::BASE_SCORE
                + TrustScoreService::VERIFIED_BONUS * (int) $row->verified
                - TrustScoreService::REJECTED_PENALTY * (int) $row->rejected));
            $scoreSum += $score;
            $levels[$this->trust->level($score)]++;
        }

        $count = count($rows);

        return [
            'period' => $this->period($from, $to),
            'users' => $count,
            'average_score' => $count > 0 ? round($scoreSum / $count, 2) : 0.0,
            'by_level' => $levels,
        ];
    }

    /**
     * Notification usage statistics.
     */
    public function notifications(?string $from = null, ?string $to = null): array
    {
        $base = Notification::query()
            ->when($from, fn ($q) => $q->whereDate('sent_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('sent_at', '<=', $to));

        $totals = (clone $base)->selectRaw(
            'COUNT(*) as total, '
            .'SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) as read_count, '
            .'COALESCE(SUM(CASE WHEN priority IN (\'high\', \'urgent\') THEN 1 ELSE 0 END), 0) as elevated'
        )->first();

        $byPriority = (clone $base)->groupBy('priority')
            ->selectRaw('priority, COUNT(*) as cnt')
            ->pluck('cnt', 'priority');

        $byType = [];
        $total = (int) ($totals->total ?? 0);
        foreach (array_keys(NotificationService::TYPES) as $type) {
            $count = (clone $base)->where('data_payload->type', $type)->count();
            if ($count > 0) {
                $byType[$type] = $count;
            }
        }

        $readCount = (int) ($totals->read_count ?? 0);

        return [
            'period' => $this->period($from, $to),
            'totals' => [
                'notifications' => $total,
                'read' => $readCount,
                'unread' => $total - $readCount,
                'elevated_priority' => (int) ($totals->elevated ?? 0),
            ],
            'by_priority' => $byPriority->toArray(),
            'by_type' => $byType,
            'read_rate' => $this->rate($readCount, $total),
        ];
    }

    /**
     * Transit mode usage from persisted journey legs.
     */
    public function modes(?string $from = null, ?string $to = null): array
    {
        $modes = JourneyLeg::query()
            ->join('journeys', 'journeys.id', '=', 'journey_legs.journey_id')
            ->when($from, fn ($q) => $q->whereDate('journeys.created_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('journeys.created_at', '<=', $to))
            ->groupBy('journey_legs.mode')
            ->selectRaw(
                'journey_legs.mode as mode, COUNT(*) as legs, '
                .'COUNT(DISTINCT journey_legs.journey_id) as journeys, '
                .'COALESCE(SUM(journey_legs.distance_meters), 0) as distance_meters, '
                .'COALESCE(AVG(journey_legs.duration_sec), 0) as avg_duration_sec'
            )
            ->orderByDesc('legs')
            ->get();

        return [
            'period' => $this->period($from, $to),
            'modes' => $modes->map(fn ($row) => [
                'mode' => $row->mode,
                'legs' => (int) $row->legs,
                'journeys' => (int) $row->journeys,
                'total_distance_meters' => (int) $row->distance_meters,
                'avg_leg_duration_sec' => round((float) $row->avg_duration_sec, 2),
            ])->toArray(),
        ];
    }

    /* --------------------------- helpers ---------------------------- */

    private function statusCounts(?string $from, ?string $to): array
    {
        return ActiveJourney::query()
            ->when($from, fn ($q) => $q->whereDate('started_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('started_at', '<=', $to))
            ->groupBy('status')
            ->selectRaw('status, COUNT(*) as cnt')
            ->pluck('cnt', 'status')
            ->toArray();
    }

    private function eventCount(string $eventType, ?string $from, ?string $to): int
    {
        return DB::table('analytics_events')
            ->where('event_type', $eventType)
            ->when($from, fn ($q) => $q->whereDate('occurred_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('occurred_at', '<=', $to))
            ->count();
    }

    private function dailySeries(string $table, string $column, ?string $from, ?string $to, ?string $eventType = null): array
    {
        return DB::table($table)
            ->when($eventType !== null, fn ($q) => $q->where('event_type', $eventType))
            ->when($from, fn ($q) => $q->whereDate($column, '>=', $from))
            ->when($to, fn ($q) => $q->whereDate($column, '<=', $to))
            ->selectRaw("date({$column}) as day, COUNT(*) as total")
            ->groupByRaw("date({$column})")
            ->orderByRaw("date({$column})")
            ->pluck('total', 'day')
            ->toArray();
    }

    private function rate(int $part, int $total): float
    {
        return $total > 0 ? round($part / $total * 100, 2) : 0.0;
    }

    private function period(?string $from, ?string $to): array
    {
        return [
            'from' => $from,
            'to' => $to,
        ];
    }
}
