<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Controller;
use App\Models\StopTime;
use Illuminate\Http\Request;
use App\Http\Requests\StopTimeRequest;
use App\Http\Resources\StopTimeResource;

class StopTimeController extends Controller
{
    /**
     * Display a listing of stop times.
     */
    public function index(Request $request)
    {
        $query = StopTime::query()->with(['schedule', 'transitStop.area.governorate']);

        // Filter by schedule_id
        if ($request->has('schedule_id')) {
            $query->where('schedule_id', $request->input('schedule_id'));
        }

        // Filter by transit_stop_id
        if ($request->has('transit_stop_id')) {
            $query->where('transit_stop_id', $request->input('transit_stop_id'));
        }

        // Sorting
        $allowedSortColumns = ['id', 'schedule_id', 'transit_stop_id', 'sequence', 'arrival_time', 'departure_time', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'sequence';
        $sortOrder = strtolower((string) $request->input('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
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
        return new StopTimeResource($stopTime->load(['schedule', 'transitStop.area.governorate']));
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
