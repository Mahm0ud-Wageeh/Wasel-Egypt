<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Api\V1\AuthController;
use App\Models\RouteGeometry;
use Illuminate\Http\Request;
use App\Http\Requests\RouteGeometryRequest;
use App\Http\Resources\RouteGeometryResource;

class RouteGeometryController extends AuthController
{
    /**
     * Display a listing of route geometry.
     */
    public function index(Request $request)
    {
        $query = RouteGeometry::query();

        // Filter by route_variant_id
        if ($request->has('route_variant_id')) {
            $query->where('route_variant_id', $request->input('route_variant_id'));
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'id');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $routeGeometries = $query->paginate($perPage);

        return RouteGeometryResource::collection($routeGeometries);
    }

    /**
     * Store a newly created route geometry.
     */
    public function store(RouteGeometryRequest $request)
    {
        $routeGeometry = RouteGeometry::create($request->validated());

        return (new RouteGeometryResource($routeGeometry))
                    ->response()
                    ->setStatusCode(201);
    }

    /**
     * Display the specified route geometry.
     */
    public function show(RouteGeometry $routeGeometry)
    {
        return new RouteGeometryResource($routeGeometry);
    }

    /**
     * Update the specified route geometry.
     */
    public function update(RouteGeometryRequest $request, RouteGeometry $routeGeometry)
    {
        $routeGeometry->update($request->validated());

        return new RouteGeometryResource($routeGeometry);
    }

    /**
     * Remove the specified route geometry.
     */
    public function destroy(RouteGeometry $routeGeometry)
    {
        $routeGeometry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Route geometry deleted successfully'
        ], 200);
    }
}