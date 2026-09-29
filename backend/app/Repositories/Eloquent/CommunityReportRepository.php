<?php

namespace App\Repositories\Eloquent;

use App\Models\CommunityReport;
use App\Repositories\Contracts\CommunityReportRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;

class CommunityReportRepository implements CommunityReportRepositoryInterface
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = CommunityReport::with(['relatedStop', 'relatedRoute']);

        if (!empty($filters['scope_user_id'])) {
            $query->where('user_id', $filters['scope_user_id']);
        } elseif (!empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        foreach (['status', 'report_type', 'related_stop_id', 'related_route_id'] as $key) {
            if (!empty($filters[$key])) {
                $query->where($key, $filters[$key]);
            }
        }

        return $query->orderBy('created_at', 'desc')
            ->paginate($filters['per_page'] ?? 15);
    }

    public function paginatePublic(array $filters): LengthAwarePaginator
    {
        $query = CommunityReport::with(['relatedStop', 'relatedRoute'])
            ->whereIn('status', ['verified', 'resolved']);

        foreach (['report_type', 'related_stop_id', 'related_route_id'] as $key) {
            if (!empty($filters[$key])) {
                $query->where($key, $filters[$key]);
            }
        }

        return $query->orderBy('occurred_at', 'desc')
            ->paginate($filters['per_page'] ?? 15);
    }

    public function find(int $id): ?CommunityReport
    {
        return CommunityReport::find($id);
    }

    public function findWithRelations(int $id): ?CommunityReport
    {
        return CommunityReport::with(['relatedStop', 'relatedRoute', 'user', 'reportModerations'])->find($id);
    }

    public function findPublicWithRelations(int $id): ?CommunityReport
    {
        return CommunityReport::with(['relatedStop', 'relatedRoute'])
            ->whereIn('status', ['verified', 'resolved'])
            ->find($id);
    }

    public function recentCountForUser(int $userId, int $windowMinutes): int
    {
        return CommunityReport::where('user_id', $userId)
            ->where('created_at', '>=', Carbon::now()->subMinutes($windowMinutes))
            ->count();
    }

    public function duplicateWithinWindow(int $userId, array $data, int $windowHours): bool
    {
        $query = CommunityReport::where('user_id', $userId)
            ->where('report_type', $data['report_type'])
            ->where('description', trim((string) $data['description']))
            ->where('created_at', '>=', Carbon::now()->subHours($windowHours));

        $stopId = $data['related_stop_id'] ?? null;
        $routeId = $data['related_route_id'] ?? null;

        $query->where(function ($q) use ($stopId) {
            $stopId === null ? $q->whereNull('related_stop_id') : $q->where('related_stop_id', $stopId);
        })->where(function ($q) use ($routeId) {
            $routeId === null ? $q->whereNull('related_route_id') : $q->where('related_route_id', $routeId);
        });

        return $query->exists();
    }
}
