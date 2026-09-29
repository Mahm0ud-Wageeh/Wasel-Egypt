<?php

namespace App\Repositories\Contracts;

use App\Models\CommunityReport;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Read boundary for the CommunityReport aggregate (see JourneyRepositoryInterface
 * for the audit rationale). Filter semantics mirror the controller contracts.
 */
interface CommunityReportRepositoryInterface
{
    /**
     * Staff see all reports (optional user_id filter); non-staff are scoped
     * to their own. Filters: scope_user_id, user_id, status, report_type,
     * related_stop_id, related_route_id, per_page.
     */
    public function paginate(array $filters): LengthAwarePaginator;

    /** Public feed: verified/resolved only. Filters: report_type, related_stop_id, related_route_id. */
    public function paginatePublic(array $filters): LengthAwarePaginator;

    public function find(int $id): ?CommunityReport;

    public function findWithRelations(int $id): ?CommunityReport;

    public function findPublicWithRelations(int $id): ?CommunityReport;

    public function recentCountForUser(int $userId, int $windowMinutes): int;

    public function duplicateWithinWindow(int $userId, array $data, int $windowHours): bool;
}
