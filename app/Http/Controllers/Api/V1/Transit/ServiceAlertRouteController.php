<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Api\V1\AuthController;
use App\Models\ServiceAlertRoute;
use Illuminate\Http\Request;
use App\Http\Requests\ServiceAlertRouteRequest;
use App\Http\Resources\ServiceAlertRouteResource;

class ServiceAlertRouteController extends AuthController
{
    /**
     * Display a listing of service alert routes.
     */
    public function index(Request $request)
    {
        $query = ServiceAlertRoute::query();

        // Filter by service_alert_id
        if ($request->has('service_alert_id')) {
            $query->where('service_alert_id', $request->input('service_alert_id'));
        }

        // Filter by route_id
        if ($request->has('route_id')) {
            $query->where('route_id', $request->input('route_id'));
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'id');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $serviceAlertRoutes = $query->paginate($perPage);

        return ServiceAlertRouteResource::collection($serviceAlertRoutes);
    }

    /**
     * Store a newly created service alert route.
     */
    public function store(ServiceAlertRouteRequest $request)
    {
        $serviceAlertRoute = ServiceAlertRoute::create($request->validated());

        return (new ServiceAlertRouteResource($serviceAlertRoute))
                    ->response()
                    ->setStatusCode(201);
    }

    /**
     * Display the specified service alert route.
     */
    public function show(ServiceAlertRoute $serviceAlertRoute)
    {
        return new ServiceAlertRouteResource($serviceAlertRoute);
    }

    /**
     * Update the specified service alert route.
     */
    public function update(ServiceAlertRouteRequest $request, ServiceAlertRoute $serviceAlertRoute)
    {
        $serviceAlertRoute->update($request->validated());

        return new ServiceAlertRouteResource($serviceAlertRoute);
    }

    /**
     * Remove the specified service alert route.
     */
    public function destroy(ServiceAlertRoute $serviceAlertRoute)
    {
        $serviceAlertRoute->delete();

        return response()->json([
            'success' => true,
            'message' => 'Service alert route deleted successfully'
        ], 200);
    }
}