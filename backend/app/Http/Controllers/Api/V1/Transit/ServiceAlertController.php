<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Controller;
use App\Models\ServiceAlert;
use Illuminate\Http\Request;
use App\Http\Requests\ServiceAlertRequest;
use App\Http\Resources\ServiceAlertResource;

class ServiceAlertController extends Controller
{
    /**
     * Display a listing of service alerts.
     */
    public function index(Request $request)
    {
        $query = ServiceAlert::query();

        // Filter by severity
        if ($request->has('severity')) {
            $query->where('severity', $request->input('severity'));
        }

        // Filter by consequence
        if ($request->has('consequence')) {
            $query->where('consequence', $request->input('consequence'));
        }

        // Filter by active_period (showing alerts that are active now)
        if ($request->has('active') && $request->input('active') === true) {
            $query->where(function ($q) {
                $q->whereNull('active_period_start')
                  ->orWhere('active_period_start', '<=', now());
            })->where(function ($q) {
                $q->whereNull('active_period_end')
                  ->orWhere('active_period_end', '>=', now());
            });
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('header_text', 'like', "%{$search}%")
                  ->orWhere('description_text', 'like', "%{$search}%");
            });
        }

        // Sorting
        $allowedSortColumns = ['id', 'severity', 'active_period_start', 'active_period_end', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'created_at';
        $sortOrder = strtolower((string) $request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
        $serviceAlerts = $query->paginate($perPage);

        return ServiceAlertResource::collection($serviceAlerts);
    }

    /**
     * Store a newly created service alert.
     */
    public function store(ServiceAlertRequest $request)
    {
        $serviceAlert = ServiceAlert::create($request->validated());

        return (new ServiceAlertResource($serviceAlert))
                    ->response()
                    ->setStatusCode(201);
    }

    /**
     * Display the specified service alert.
     */
    public function show(ServiceAlert $serviceAlert)
    {
        return new ServiceAlertResource($serviceAlert);
    }

    /**
     * Update the specified service alert.
     */
    public function update(ServiceAlertRequest $request, ServiceAlert $serviceAlert)
    {
        $serviceAlert->update($request->validated());

        return new ServiceAlertResource($serviceAlert);
    }

    /**
     * Remove the specified service alert.
     */
    public function destroy(ServiceAlert $serviceAlert)
    {
        $serviceAlert->delete();

        return response()->json([
            'success' => true,
            'message' => 'Service alert deleted successfully'
        ], 200);
    }

    /**
     * Get all active service alerts for public use (no authentication required).
     */
    public function getActiveAlerts(Request $request)
    {
        $query = ServiceAlert::query()
            ->with(['serviceAlertRoutes.routeVariant', 'serviceAlertStops.transitStop.area.governorate'])
            ->where(function ($q) {
                $q->whereNull('active_period_start')
                  ->orWhere('active_period_start', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('active_period_end')
                  ->orWhere('active_period_end', '>=', now());
            });

        // Search functionality
        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('header_text', 'like', "%{$search}%")
                  ->orWhere('description_text', 'like', "%{$search}%");
            });
        }

        // Sorting
        $allowedSortColumns = ['id', 'severity', 'active_period_start', 'active_period_end', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'created_at';
        $sortOrder = strtolower((string) $request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
        $serviceAlerts = $query->paginate($perPage);

        return ServiceAlertResource::collection($serviceAlerts);
    }

    /**
     * Get a specific active service alert for public use.
     */
    public function getActiveAlert(ServiceAlert $serviceAlert)
    {
        // Check if the alert is active now
        $isActive = ($serviceAlert->active_period_start === null || $serviceAlert->active_period_start->lte(now())) &&
                    ($serviceAlert->active_period_end === null || $serviceAlert->active_period_end->gte(now()));

        if (!$isActive) {
            return response()->json([
                'success' => false,
                'message' => 'Service alert not found or not active'
            ], 404);
        }

        return new ServiceAlertResource($serviceAlert);
    }
}