<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Controller;
use App\Models\Route;
use App\Models\RouteVariant;
use Illuminate\Http\Request;
use App\Http\Requests\RouteRequest;
use App\Http\Resources\RouteResource;
use App\Models\TransitMode;
use Illuminate\Support\Facades\Log;

class RouteController extends Controller
{
    /**
     * Display a listing of routes.
     */
    public function index(Request $request)
    {
        $query = Route::query()->with(['transitMode', 'transitOperator']);

        // Filter by transit_mode_id
        if ($request->has('transit_mode_id')) {
            $query->where('transit_mode_id', $request->input('transit_mode_id'));
        }

        // Filter by transit_operator_id
        if ($request->has('transit_operator_id')) {
            $query->where('transit_operator_id', $request->input('transit_operator_id'));
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('long_name', 'like', "%{$search}%")
                  ->orWhere('short_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sorting
        $allowedSortColumns = ['id', 'short_name', 'long_name', 'transit_mode_id', 'transit_operator_id', 'sort_order', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'long_name';
        $sortOrder = strtolower((string) $request->input('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
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
        return new RouteResource($route->load(['transitMode', 'transitOperator']));
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
        $query = Route::query()->with(['transitMode', 'transitOperator']);

        // Filter by transit_mode_id
        if ($request->has('transit_mode_id')) {
            $query->where('transit_mode_id', $request->input('transit_mode_id'));
        }

        // Filter by transit_operator_id
        if ($request->has('transit_operator_id')) {
            $query->where('transit_operator_id', $request->input('transit_operator_id'));
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('long_name', 'like', "%{$search}%")
                  ->orWhere('short_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sorting
        $allowedSortColumns = ['id', 'short_name', 'long_name', 'transit_mode_id', 'transit_operator_id', 'sort_order', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'long_name';
        $sortOrder = strtolower((string) $request->input('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
        $routes = $query->paginate($perPage);

        return RouteResource::collection($routes);
    }

    /**
     * Get a specific route for public use.
     */
    public function publicShow(Route $route)
    {
        // Route/line page (design §route): variants with direction/headsign
        // and per-variant geometry/schedule summaries, in one payload.
        $route->load([
            'routeVariants' => fn ($q) => $q->where('active', true)->orderBy('id'),
        ]);

        $variants = $route->routeVariants->map(function ($variant) {
            $geometry = $variant->routeGeometry()->value('geometry');
            $windows = $variant->schedules()
                ->where('is_active', true)
                ->orderBy('id')
                ->value('frequency_windows');

            return [
                'id' => $variant->id,
                'name' => $variant->name,
                'headsign' => $variant->headsign,
                'direction' => $variant->direction,
                'active' => $variant->active,
                'reliability_score' => $variant->reliability_score !== null
                    ? (float) $variant->reliability_score
                    : null,
                'has_geometry' => is_array($geometry) && count($geometry) >= 2,
                'frequency_windows' => is_array($windows) ? $windows : null,
            ];
        });

        $base = (new RouteResource($route))->resolve(request());
        $base['variants'] = $variants->values()->all();

        return response()->json([
            'success' => true,
            'data' => $base,
        ]);
    }

    /**
     * Public polyline for one route variant (route geometry table —
     * the same data the planner uses for leg rendering). Real geometry
     * only: 404s when the variant has no stored shape instead of
     * inventing a line.
     */
    public function publicVariantGeometry($variantId)
    {
        $variant = RouteVariant::where('active', true)->find($variantId);

        if (!$variant) {
            return response()->json([
                'success' => false,
                'message' => 'Route variant not found',
            ], 404);
        }

        $geometry = $variant->routeGeometry()->first();

        if (!$geometry || !is_array($geometry->geometry) || count($geometry->geometry) < 2) {
            return response()->json([
                'success' => false,
                'message' => 'No geometry stored for this variant',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'route_variant_id' => (int) $variantId,
                'length_meters' => $geometry->length_meters !== null
                    ? (float) $geometry->length_meters
                    : null,
                'points' => count($geometry->geometry),
                'geometry' => $geometry->geometry,
            ],
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
                    'headsign' => $variant->headsign,
                    'direction' => $variant->direction,
                    'active' => $variant->active,
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