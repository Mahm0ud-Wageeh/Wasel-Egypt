<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Controller;
use App\Models\RouteGeometry;
use Illuminate\Http\Request;
use App\Http\Requests\RouteGeometryRequest;
use App\Http\Resources\RouteGeometryResource;

class RouteGeometryController extends Controller
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
        $allowedSortColumns = ['id', 'route_variant_id', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'id';
        $sortOrder = strtolower((string) $request->input('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
        $routeGeometries = $query->paginate($perPage);

        return RouteGeometryResource::collection($routeGeometries);
    }

    /**
     * Store a newly created route geometry.
     */
    public function store(RouteGeometryRequest $request)
    {
        $routeGeometry = RouteGeometry::create($this->payload($request));

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
        $routeGeometry->update($this->payload($request));

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

    /**
     * Attribute set for create/update. The full-polyline form (geometry
     * array) stores the shape and recomputes the stored length; the legacy
     * per-point form (latitude/longitude/sequence) rewrites the geometry
     * list with that single point (legacy contract, unchanged).
     */
    private function payload(RouteGeometryRequest $request): array
    {
        $validated = $request->validated();
        $payload = ['route_variant_id' => $validated['route_variant_id']];

        if (isset($validated['geometry'])) {
            $payload['geometry'] = $validated['geometry'];
            $payload['length_meters'] = $this->polylineLength($validated['geometry']);
        } else {
            $payload['geometry'] = [[
                (float) $validated['latitude'],
                (float) $validated['longitude'],
            ]];
            $payload['length_meters'] = 0;
        }

        return $payload;
    }

    /**
     * Haversine length of the polyline in whole meters — the same metric
     * the GTFS importer records, recomputed on manual edits so the stored
     * length never goes stale.
     *
     * @param array<array{0: float, 1: float}> $points [lat,lng] pairs
     */
    private function polylineLength(array $points): int
    {
        $rad = pi() / 180;
        $meters = 0.0;
        for ($i = 1; $i < count($points); $i++) {
            $lat1 = (float) $points[$i - 1][0];
            $lon1 = (float) $points[$i - 1][1];
            $lat2 = (float) $points[$i][0];
            $lon2 = (float) $points[$i][1];
            $dLat = ($lat2 - $lat1) * $rad;
            $dLon = ($lon2 - $lon1) * $rad;
            $a = sin($dLat / 2) ** 2 + cos($lat1 * $rad) * cos($lat2 * $rad) * sin($dLon / 2) ** 2;
            $meters += 6371000 * 2 * atan2(sqrt($a), sqrt(1 - $a));
        }

        return (int) round($meters);
    }
}
