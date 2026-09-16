<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Controller;
use App\Models\Area;
use Illuminate\Http\Request;
use App\Http\Requests\AreaRequest;
use App\Http\Resources\AreaResource;

class AreaController extends Controller
{
    /**
     * Display a listing of areas.
     */
    public function index(Request $request)
    {
        $query = Area::query()->with('governorate');

        // Filter by governorate_id
        if ($request->has('governorate_id')) {
            $query->where('governorate_id', $request->input('governorate_id'));
        }

        // Search functionality
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        // Sorting
        $allowedSortColumns = ['id', 'name', 'governorate_id', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'name';
        $sortOrder = strtolower((string) $request->input('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
        $areas = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => AreaResource::collection($areas)->toArray($request),
            'meta' => [
                'total' => $areas->total(),
                'per_page' => $areas->perPage(),
                'current_page' => $areas->currentPage(),
                'last_page' => $areas->lastPage(),
            ]
        ]);
    }

    /**
     * Store a newly created area.
     */
    public function store(AreaRequest $request)
    {
        $area = Area::create($request->validated());

        return response()->json([
            'success' => true,
            'data' => new AreaResource($area)
        ], 201);
    }

    /**
     * Display the specified area.
     */
    public function show($id)
    {
        $area = Area::with('governorate')->findOrFail($id);
        return response()->json([
            'success' => true,
            'data' => new AreaResource($area)
        ]);
    }

    /**
     * Update the specified area.
     */
    public function update(AreaRequest $request, $id)
    {
        $area = Area::findOrFail($id);
        $area->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => new AreaResource($area)
        ]);
    }

    /**
     * Remove the specified area.
     */
    public function destroy($id)
    {
        $area = Area::findOrFail($id);
        $area->delete();

        return response()->json([
            'success' => true,
            'message' => 'Area deleted successfully'
        ], 200);
    }

    /**
     * Public listing of areas.
     */
    public function publicIndex(Request $request)
    {
        $query = Area::query()->with('governorate');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        $allowedSortColumns = ['id', 'name', 'governorate_id', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'name';
        $sortOrder = strtolower((string) $request->input('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortOrder);

        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
        $areas = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => AreaResource::collection($areas)->toArray($request),
            'meta' => [
                'total' => $areas->total(),
                'per_page' => $areas->perPage(),
                'current_page' => $areas->currentPage(),
                'last_page' => $areas->lastPage(),
            ]
        ]);
    }

    /**
     * Public display of an area.
     */
    public function publicShow($id)
    {
        $area = Area::with('governorate')->findOrFail($id);
        return response()->json([
            'success' => true,
            'data' => new AreaResource($area)
        ]);
    }
}