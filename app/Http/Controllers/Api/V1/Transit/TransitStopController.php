<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Api\V1\AuthController;
use App\Models\TransitStop;
use Illuminate\Http\Request;
use App\Http\Requests\TransitStopRequest;
use App\Http\Resources\TransitStopResource;

class TransitStopController extends AuthController
{
    /**
     * Display a listing of transit stops.
     */
    public function index(Request $request)
    {
        $query = TransitStop::query()->with('area.governorate');

        // Filter by area_id
        if ($request->has('area_id')) {
            $query->where('area_id', $request->input('area_id'));
        }

        // Search functionality
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $transitStops = $query->paginate($perPage);

        return TransitStopResource::collection($transitStops);
    }

    /**
     * Store a newly created transit stop.
     */
    public function store(TransitStopRequest $request)
    {
        $transitStop = TransitStop::create($request->validated());

        return (new TransitStopResource($transitStop))
                    ->response()
                    ->setStatusCode(201);
    }

    /**
     * Display the specified transit stop.
     */
    public function show(TransitStop $transitStop)
    {
        $transitStop->load('area.governorate');
        return new TransitStopResource($transitStop);
    }

    /**
     * Update the specified transit stop.
     */
    public function update(TransitStopRequest $request, TransitStop $transitStop)
    {
        $transitStop->update($request->validated());

        return new TransitStopResource($transitStop);
    }

    /**
     * Remove the specified transit stop.
     */
    public function destroy(TransitStop $transitStop)
    {
        $transitStop->delete();

        return response()->json([
            'success' => true,
            'message' => 'Transit stop deleted successfully'
        ], 200);
    }

    /**
     * Get all transit stops for public use (no authentication required).
     */
    public function publicIndex(Request $request)
    {
        // We can reuse the same logic as index but without authentication check in middleware
        // However, note that the publicIndex route is outside the auth middleware group.
        // We'll just return all stops without any filtering for now, but we can add search and pagination.
        $query = TransitStop::query()->with('area.governorate');

        // Search functionality
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $transitStops = $query->paginate($perPage);

        return TransitStopResource::collection($transitStops);
    }

    /**
     * Get a specific transit stop for public use.
     */
    public function publicShow($id)
    {
        $transitStop = TransitStop::with('area.governorate')->find($id);

        if (!$transitStop) {
            return response()->json([
                'success' => false,
                'message' => 'Transit stop not found',
            ], 404);
        }

        return new TransitStopResource($transitStop);
    }
}