<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Api\V1\AuthController;
use App\Models\Schedule;
use Illuminate\Http\Request;
use App\Http\Requests\ScheduleRequest;
use App\Http\Resources\ScheduleResource;

class ScheduleController extends AuthController
{
    /**
     * Display a listing of schedules.
     */
    public function index(Request $request)
    {
        $query = Schedule::query();

        // Filter by route_variant_id
        if ($request->has('route_variant_id')) {
            $query->where('route_variant_id', $request->input('route_variant_id'));
        }

        // Filter by transit_operator_id
        if ($request->has('transit_operator_id')) {
            $query->where('transit_operator_id', $request->input('transit_operator_id'));
        }

        // Filter by is_active
        if ($request->has('is_active')) {
            $isActive = $request->input('is_active') === 'true';
            $query->where('is_active', $isActive);
        }

        // Search functionality
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('headsign', 'like', "%{$search}%")
                  ->orWhere('gtfs_trip_id', 'like', "%{$search}%")
                  ->orWhere('service_id', 'like', "%{$search}%");
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'id');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $schedules = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => ScheduleResource::collection($schedules)->toArray($request),
            'meta' => [
                'total' => $schedules->total(),
                'per_page' => $schedules->perPage(),
                'current_page' => $schedules->currentPage(),
                'last_page' => $schedules->lastPage(),
            ]
        ]);
    }

    /**
     * Store a newly created schedule.
     */
    public function store(ScheduleRequest $request)
    {
        $schedule = Schedule::create($request->validated());

        return (new ScheduleResource($schedule))
                    ->response()
                    ->setStatusCode(201);
    }

    /**
     * Display the specified schedule.
     */
    public function show(Schedule $schedule)
    {
        return new ScheduleResource($schedule);
    }

    /**
     * Update the specified schedule.
     */
    public function update(ScheduleRequest $request, Schedule $schedule)
    {
        $schedule->update($request->validated());

        return new ScheduleResource($schedule);
    }

    /**
     * Remove the specified schedule.
     */
    public function destroy(Schedule $schedule)
    {
        $schedule->delete();

        return response()->json([
            'success' => true,
            'message' => 'Schedule deleted successfully'
        ], 200);
    }

    /**
     * Get all schedules for public use (no authentication required).
     */
    public function publicIndex(Request $request)
    {
        $query = Schedule::query();

        // Filter by route_variant_id
        if ($request->has('route_variant_id')) {
            $query->where('route_variant_id', $request->input('route_variant_id'));
        }

        // Filter by is_active (only active schedules for public)
        $query->where('is_active', true);

        // Search functionality
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('headsign', 'like', "%{$search}%")
                  ->orWhere('gtfs_trip_id', 'like', "%{$search}%")
                  ->orWhere('service_id', 'like', "%{$search}%");
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'id');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $schedules = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => ScheduleResource::collection($schedules)->toArray($request),
            'meta' => [
                'total' => $schedules->total(),
                'per_page' => $schedules->perPage(),
                'current_page' => $schedules->currentPage(),
                'last_page' => (int) $schedules->lastPage(),
            ]
        ]);
    }

    /**
     * Get a specific schedule for public use.
     */
    public function publicShow($id)
    {
        $schedule = Schedule::find($id);

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found'
            ], 404);
        }

        // Only return if active
        if (!$schedule->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found or not active'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new ScheduleResource($schedule)
        ]);
    }
}