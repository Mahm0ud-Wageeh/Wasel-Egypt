<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Api\V1\AuthController;
use App\Models\Route;
use Illuminate\Http\Request;
use App\Http\Requests\RouteRequest;
use App\Http\Resources\RouteResource;
use App\Models\TransitMode;
use Illuminate\Support\Facades\Log;

class RouteController extends AuthController
{
    /**
     * Display a listing of routes.
     */
    public function index(Request $request)
    {
        $query = Route::query();

        // Filter by transit_mode_id
        if ($request->has('transit_mode_id')) {
            $query->where('transit_mode_id', $request->input('transit_mode_id'));
        }

        // Filter by transit_operator_id
        if ($request->has('transit_operator_id')) {
            $query->where('transit_operator_id', $request->input('transit_operator_id'));
        }

        // Search functionality
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('long_name', 'like', "%{$search}%")
                  ->orWhere('short_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'long_name');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $routes = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => RouteResource::collection($routes),
            'meta' => [
                'total' => $routes->total(),
                'per_page' => $routes->perPage(),
                'current_page' => $routes->currentPage(),
                'last_page' => $routes->lastPage(),
            ]
        ]);
    }

    /**
     * Store a newly created route.
     */
    public function store(RouteRequest $request)
    {
        $route = Route::create($request->validated());

        return (new RouteResource($route))
                    ->response()
                    ->setStatusCode(201);
    }

    /**
     * Display the specified route.
     */
    public function show(Route $route)
    {
        return new RouteResource($route);
    }

    /**
     * Update the specified route.
     */
    public function update(RouteRequest $request, Route $route)
    {
        $route->update($request->validated());

        return new RouteResource($route);
    }

    /**
     * Remove the specified route.
     */
    public function destroy(Route $route)
    {
        $route->delete();

        return response()->json([
            'success' => true,
            'message' => 'Route deleted successfully'
        ], 200);
    }

    /**
     * Get all routes for public use (no authentication required).
     */
    public function publicIndex(Request $request)
    {
        $query = Route::query();

        // Filter by transit_mode_id
        if ($request->has('transit_mode_id')) {
            $query->where('transit_mode_id', $request->input('transit_mode_id'));
        }

        // Filter by transit_operator_id
        if ($request->has('transit_operator_id')) {
            $query->where('transit_operator_id', $request->input('transit_operator_id'));
        }

        // Search functionality
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('long_name', 'like', "%{$search}%")
                  ->orWhere('short_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'long_name');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $routes = $query->paginate($perPage);

        return RouteResource::collection($routes);
    }

    /**
     * Get a specific route for public use.
     */
    public function publicShow(Route $route)
    {
        return response()->json([
            'success' => true,
            'data' => new RouteResource($route)
        ]);
    }

    /**
     * Get stops for a specific route with ordering.
     */
    public function getRouteStops(Request $request, $routeId)
    {
        $route = Route::findOrFail($routeId);

        // Get route variants for this route, then get their stops with ordering
        $routeStops = $route->routeVariants()
            ->with(['routeStops.transitStop'])
            ->get()
            ->map(function($variant) {
                return [
                    'variant_id' => $variant->id,
                    'variant_name' => $variant->name,
                    'stops' => $variant->routeStops
                        ->sortBy('sequence')
                        ->map(function($routeStop) {
                            return [
                                'id' => $routeStop->id,
                                'stop_id' => $routeStop->transit_stop_id,
                                'stop_name' => $routeStop->transitStop?->name,
                                'latitude' => $routeStop->transitStop?->latitude,
                                'longitude' => $routeStop->transitStop?->longitude,
                                'stop_sequence' => $routeStop->sequence,
                                'platform_code' => $routeStop->transitStop?->platform_code,
                            ];
                        })
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $routeStops
        ]);
    }
}