<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Controller;
use App\Models\TransitStop;
use App\Services\Journey\GeoCalculator;
use App\Services\Transit\StopDeparturesService;
use Illuminate\Http\Request;
use App\Http\Requests\TransitStopRequest;
use App\Http\Resources\TransitStopResource;

class TransitStopController extends Controller
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
        $allowedSortColumns = ['id', 'name', 'area_id', 'latitude', 'longitude', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'name';
        $sortOrder = strtolower((string) $request->input('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
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
     *
     * Supported filters: search (name LIKE), area_id, bbox
     * (minLng,minLat,maxLng,maxLat — bounding-box viewport queries for
     * map layers), and lat/lng/radius (nearby search, haversine meters —
     * the stop info panel / "stops near me" map layer). All additive —
     * existing consumers are unaffected.
     */
    public function publicIndex(Request $request)
    {
        $query = TransitStop::query()->with('area.governorate');

        // Search functionality
        if ($request->has('search') && trim((string) $request->input('search')) !== '') {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        // Bounding-box filter for map viewport queries: bbox=minLng,minLat,maxLng,maxLat
        if ($request->has('bbox') && trim((string) $request->input('bbox')) !== '') {
            $parts = array_map('floatval', explode(',', (string) $request->input('bbox')));
            if (count($parts) === 4
                && $parts[0] >= -180 && $parts[2] >= -180 && $parts[0] <= 180 && $parts[2] <= 180
                && $parts[1] >= -90 && $parts[3] >= -90 && $parts[1] <= 90 && $parts[3] <= 90) {
                $query->whereBetween('longitude', [min($parts[0], $parts[2]), max($parts[0], $parts[2])]);
                $query->whereBetween('latitude', [min($parts[1], $parts[3]), max($parts[1], $parts[3])]);
            }
        }

        // Nearby search: lat/lng/radius (meters, default 500, max 2000).
        // Distance filtering happens post-query (haversine) so the
        // index-friendly bbox prefilter stays optional.
        $nearby = null;
        if ($request->filled('lat') && $request->filled('lng')) {
            $lat = (float) $request->input('lat');
            $lng = (float) $request->input('lng');
            $radius = min(2000, max(50, (int) $request->input('radius', 500)));

            if ($lat >= -90 && $lat <= 90 && $lng >= -180 && $lng <= 180) {
                $nearby = ['lat' => $lat, 'lng' => $lng, 'radius' => $radius];
                // Cheap degree-space prefilter before exact haversine.
                $dLat = $radius / 111000;
                $dLng = $radius / (111000 * max(0.2, cos(deg2rad($lat))));
                $query->whereBetween('latitude', [$lat - $dLat, $lat + $dLat]);
                $query->whereBetween('longitude', [$lng - $dLng, $lng + $dLng]);
            }
        }

        // Sorting
        if ($nearby !== null) {
            // Nearby results read best nearest-first; distance computed per row.
            $perPage = min(100, (int) $request->input('per_page', 40));
            $all = $query->get();
            $withDistance = $all->map(function ($stop) use ($nearby) {
                $stop->distance_meters = (int) round(
                    GeoCalculator::distanceMeters($nearby['lat'], $nearby['lng'], (float) $stop->latitude, (float) $stop->longitude)
                );
                return $stop;
            })->filter(fn ($stop) => $stop->distance_meters <= $nearby['radius'])
                ->sortBy('distance_meters')
                ->values();
            $page = \Illuminate\Pagination\Paginator::resolveCurrentPage();
            $items = $withDistance->forPage($page, $perPage);
            $paginator = new \Illuminate\Pagination\LengthAwarePaginator(
                $items,
                $withDistance->count(),
                $perPage,
                $page,
                ['path' => \Illuminate\Pagination\Paginator::resolveCurrentPath()]
            );
            // Same {data, links, meta} envelope as every other paginated
            // endpoint — the frontend reads meta.total on /stops already.
            return TransitStopResource::collection($paginator);
        }

        $allowedSortColumns = ['id', 'name', 'area_id', 'latitude', 'longitude', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'name';
        $sortOrder = strtolower((string) $request->input('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
        $transitStops = $query->paginate($perPage);

        return TransitStopResource::collection($transitStops);
    }

    /**
     * Get a specific transit stop for public use.
     *
     * When ?with_routes=1, includes the serving routes (design §10 stop
     * panel): active variants through this stop with mode + line info.
     */
    public function publicShow(Request $request, $id)
    {
        $transitStop = TransitStop::with('area.governorate')->find($id);

        if (!$transitStop) {
            return response()->json([
                'success' => false,
                'message' => 'Transit stop not found',
            ], 404);
        }

        $resource = new TransitStopResource($transitStop);

        if ($request->boolean('with_routes')) {
            $resource->additional([
                'data' => array_merge(
                    $resource->resolve($request),
                    ['serving_routes' => $this->servingRoutesFor($transitStop)]
                ),
            ]);
        }

        return $resource;
    }

    /**
     * Upcoming departures at a stop (public stop info panel, design §10).
     *
     * GET /stops/{id}/departures?limit=3
     * Resolves real times from schedules/stop_times/frequency_windows
     * (StopDeparturesService); variants without timetable data are listed
     * with has_timetable=false — no invented times.
     */
    public function publicDepartures(Request $request, $id)
    {
        $transitStop = TransitStop::find($id);

        if (!$transitStop) {
            return response()->json([
                'success' => false,
                'message' => 'Transit stop not found',
            ], 404);
        }

        $limit = min(6, max(1, (int) $request->input('limit', 3)));
        $service = app(StopDeparturesService::class);
        $departures = $service->upcomingDepartures($transitStop, null, $limit);

        return response()->json([
            'success' => true,
            'data' => [
                'stop' => [
                    'id' => $transitStop->id,
                    'name' => $transitStop->name,
                    'latitude' => $transitStop->latitude,
                    'longitude' => $transitStop->longitude,
                ],
                'generated_at' => now()->toISOString(),
                'departures' => $departures,
            ],
        ]);
    }

    /**
     * Active routes serving a stop, deduplicated by route with the
     * modes of its serving variants (stop panel "Lines" chips).
     */
    private function servingRoutesFor(TransitStop $stop): array
    {
        return $stop->routeStops()
            ->with(['routeVariant.route.transitMode'])
            ->get()
            ->filter(fn ($rs) => $rs->routeVariant && $rs->routeVariant->active && $rs->routeVariant->route)
            ->groupBy(fn ($rs) => $rs->routeVariant->route->id)
            ->map(function ($group) {
                $first = $group->first();
                $route = $first->routeVariant->route;
                return [
                    'route_id' => $route->id,
                    'short_name' => $route->short_name,
                    'long_name' => $route->long_name,
                    'color' => $route->color,
                    'modes' => $group->map(fn ($rs) => $rs->routeVariant->route->transitMode->name ?? 'bus')
                        ->unique()->values()->all(),
                    'variants_count' => $group->pluck('route_variant_id')->unique()->count(),
                ];
            })
            ->values()
            ->all();
    }
}