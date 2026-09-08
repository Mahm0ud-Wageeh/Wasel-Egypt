<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Api\V1\AuthController;
use App\Models\StopTime;
use Illuminate\Http\Request;
use App\Http\Requests\StopTimeRequest;
use App\Http\Resources\StopTimeResource;

class StopTimeController extends AuthController
{
    /**
     * Display a listing of stop times.
     */
    public function index(Request $request)
    {
        $query = StopTime::query();

        // Filter by schedule_id
        if ($request->has('schedule_id')) {
            $query->where('schedule_id', $request->input('schedule_id'));
        }

        // Filter by transit_stop_id
        if ($request->has('transit_stop_id')) {
            $query->where('transit_stop_id', $request->input('transit_stop_id'));
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'sequence');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $stopTimes = $query->paginate($perPage);

        return StopTimeResource::collection($stopTimes);
    }

    /**
     * Store a newly created stop time.
     */
    public function store(StopTimeRequest $request)
    {
        $stopTime = StopTime::create($request->validated());

        return (new StopTimeResource($stopTime))
                    ->response()
                    ->setStatusCode(201);
    }

    /**
     * Display the specified stop time.
     */
    public function show(StopTime $stopTime)
    {
        return new StopTimeResource($stopTime);
    }

    /**
     * Update the specified stop time.
     */
    public function update(StopTimeRequest $request, StopTime $stopTime)
    {
        $stopTime->update($request->validated());

        return new StopTimeResource($stopTime);
    }

    /**
     * Remove the specified stop time.
     */
    public function destroy(StopTime $stopTime)
    {
        $stopTime->delete();

        return response()->json([
            'success' => true,
            'message' => 'Stop time deleted successfully'
        ], 200);
    }
}
