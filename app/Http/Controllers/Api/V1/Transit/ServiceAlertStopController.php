<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Api\V1\AuthController;
use App\Models\ServiceAlertStop;
use Illuminate\Http\Request;
use App\Http\Requests\ServiceAlertStopRequest;
use App\Http\Resources\ServiceAlertStopResource;

class ServiceAlertStopController extends AuthController
{
    /**
     * Display a listing of service alert stops.
     */
    public function index(Request $request)
    {
        $query = ServiceAlertStop::query();

        // Filter by service_alert_id
        if ($request->has('service_alert_id')) {
            $query->where('service_alert_id', $request->input('service_alert_id'));
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
        $serviceAlertStops = $query->paginate($perPage);

        return ServiceAlertStopResource::collection($serviceAlertStops);
    }

    /**
     * Store a newly created service alert stop.
     */
    public function store(ServiceAlertStopRequest $request)
    {
        $serviceAlertStop = ServiceAlertStop::create($request->validated());

        return (new ServiceAlertStopResource($serviceAlertStop))
                    ->response()
                    ->setStatusCode(201);
    }

    /**
     * Display the specified service alert stop.
     */
    public function show(ServiceAlertStop $serviceAlertStop)
    {
        return new ServiceAlertStopResource($serviceAlertStop);
    }

    /**
     * Update the specified service alert stop.
     */
    public function update(ServiceAlertStopRequest $request, ServiceAlertStop $serviceAlertStop)
    {
        $serviceAlertStop->update($request->validated());

        return new ServiceAlertStopResource($serviceAlertStop);
    }

    /**
     * Remove the specified service alert stop.
     */
    public function destroy(ServiceAlertStop $serviceAlertStop)
    {
        $serviceAlertStop->delete();

        return response()->json([
            'success' => true,
            'message' => 'Service alert stop deleted successfully'
        ], 200);
    }
}