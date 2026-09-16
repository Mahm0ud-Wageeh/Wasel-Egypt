<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Controller;
use App\Models\RouteVariant;
use Illuminate\Http\Request;
use App\Http\Requests\RouteVariantRequest;
use App\Http\Resources\RouteVariantResource;

class RouteVariantController extends Controller
{
    /**
     * Display a listing of route variants.
     */
    public function index(Request $request)
    {
        $query = RouteVariant::query();

        // Filter by route_id
        if ($request->has('route_id')) {
            $query->where('route_id', $request->input('route_id'));
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sorting
        $allowedSortColumns = ['id', 'route_id', 'name', 'direction', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'name';
        $sortOrder = strtolower((string) $request->input('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
        $routeVariants = $query->paginate($perPage);

        return RouteVariantResource::collection($routeVariants);
    }

    /**
     * Store a newly created route variant.
     */
    public function store(RouteVariantRequest $request)
    {
        $routeVariant = RouteVariant::create($request->validated());

        return (new RouteVariantResource($routeVariant))
                    ->response()
                    ->setStatusCode(201);
    }

    /**
     * Display the specified route variant.
     */
    public function show(RouteVariant $routeVariant)
    {
        return new RouteVariantResource($routeVariant);
    }

    /**
     * Update the specified route variant.
     */
    public function update(RouteVariantRequest $request, RouteVariant $routeVariant)
    {
        $routeVariant->update($request->validated());

        return new RouteVariantResource($routeVariant);
    }

    /**
     * Remove the specified route variant.
     */
    public function destroy(RouteVariant $routeVariant)
    {
        $routeVariant->delete();

        return response()->json([
            'success' => true,
            'message' => 'Route variant deleted successfully'
        ], 200);
    }
}