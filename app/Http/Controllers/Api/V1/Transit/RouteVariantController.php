<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Api\V1\AuthController;
use App\Models\RouteVariant;
use Illuminate\Http\Request;
use App\Http\Requests\RouteVariantRequest;
use App\Http\Resources\RouteVariantResource;

class RouteVariantController extends AuthController
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
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
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