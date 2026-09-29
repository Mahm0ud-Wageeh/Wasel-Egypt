<?php

namespace App\Repositories\Eloquent;

use App\Models\Journey;
use App\Repositories\Contracts\JourneyRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class JourneyRepository implements JourneyRepositoryInterface
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Journey::query()->with('journeyLegs');

        if (!empty($filters['scope_user_id'])) {
            $query->where('user_id', $filters['scope_user_id']);
        } elseif (!empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderBy('created_at', 'desc')
            ->paginate($filters['per_page'] ?? 15);
    }

    public function find(int $id): ?Journey
    {
        return Journey::find($id);
    }

    public function findWithLegs(int $id): ?Journey
    {
        return Journey::with([
            'journeyLegs.routeVariant.route.transitMode',
            'journeyLegs.transitStopFrom',
            'journeyLegs.transitStopTo',
            'journeyLegs.agency',
            'transfers',
        ])->find($id);
    }

    public function create(array $attributes): Journey
    {
        return Journey::create($attributes);
    }
}
