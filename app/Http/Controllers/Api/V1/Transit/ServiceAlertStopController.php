<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Controller;
use App\Models\ServiceAlertStop;
use Illuminate\Http\Request;
use App\Http\Requests\ServiceAlertStopRequest;
use App\Http\Resources\ServiceAlertStopResource;

class ServiceAlertStopController extends Controller
{
    /**
     * Display a listing of service alert stops.
     */
    public function index(Request $request)
    {
        $query = ServiceAlertStop::query()->with('transitStop');

        // Filter by service_alert_id
        if ($request->has('service_alert_id')) {
            $query->where('service_alert_id', $request->input('service_alert_id'));
        }

        // Filter by transit_stop_id
        if ($request->has('transit_stop_id')) {
            $query->where('transit_stop_id', $request->input('transit_stop_id'));
        }

        // Sorting
        $allowedSortColumns = ['id', 'service_alert_id', 'transit_stop_id', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'id';
        $sortOrder = strtolower((string) $request->input('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
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
        return new ServiceAlertStopResource($serviceAlertStop->load('transitStop'));
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