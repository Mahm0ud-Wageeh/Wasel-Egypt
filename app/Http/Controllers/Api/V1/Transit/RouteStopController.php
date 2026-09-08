<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Api\V1\AuthController;
use App\Models\RouteStop;
use Illuminate\Http\Request;
use App\Http\Requests\RouteStopRequest;
use App\Http\Resources\RouteStopResource;

class RouteStopController extends AuthController
{
    /**
     * Display a listing of route stops.
     */
    public function index(Request $request)
    {
        $query = RouteStop::query();

        // Filter by route_variant_id
        if ($request->has('route_variant_id')) {
            $query->where('route_variant_id', $request->input('route_variant_id'));
        }

        // Filter by transit_stop_id
        if ($request->has('transit_stop_id')) {
            $query->where('transit_stop_id', $request->input('transit_stop_id'));
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'id');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $routeStops = $query->paginate($perPage);

        return RouteStopResource::collection($routeStops);
    }

    /**
     * Store a newly created route stop.
     */
    public function store(RouteStopRequest $request)
    {
        $routeStop = RouteStop::create($request->validated());

        return (new RouteStopResource($routeStop))
                    ->response()
                    ->setStatusCode(201);
    }

    /**
     * Display the specified route stop.
     */
    public function show(RouteStop $routeStop)
    {
        return new RouteStopResource($routeStop);
    }

    /**
     * Update the specified route stop.
     */
    public function update(RouteStopRequest $request, RouteStop $routeStop)
    {
        $routeStop->update($request->validated());

        return new RouteStopResource($routeStop);
    }

    /**
     * Remove the specified route stop.
     */
    public function destroy(RouteStop $routeStop)
    {
        $routeStop->delete();

        return response()->json([
            'success' => true,
            'message' => 'Route stop deleted successfully'
        ], 200);
    }
}