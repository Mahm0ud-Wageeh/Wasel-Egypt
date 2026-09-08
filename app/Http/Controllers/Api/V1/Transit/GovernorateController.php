<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Api\V1\AuthController;
use App\Models\Governorate;
use Illuminate\Http\Request;
use App\Http\Requests\GovernorateRequest;
use App\Http\Resources\GovernorateResource;

class GovernorateController extends AuthController
{
    /**
     * Display a listing of governorates.
     */
    public function index(Request $request)
    {
        $query = Governorate::query();

        // Search functionality
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $governorates = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => GovernorateResource::collection($governorates)->toArray($request),
            'meta' => [
                'total' => $governorates->total(),
                'per_page' => $governorates->perPage(),
                'current_page' => $governorates->currentPage(),
                'last_page' => $governorates->lastPage(),
            ]
        ]);
    }

    /**
     * Store a newly created governorate.
     */
    public function store(GovernorateRequest $request)
    {
        $governorate = Governorate::create($request->validated());

        return response()->json([
            'success' => true,
            'data' => new GovernorateResource($governorate)
        ], 201);
    }

    /**
     * Display the specified governorate.
     */
    public function show($id)
    {
        $governorate = Governorate::findOrFail($id);
        return response()->json([
            'success' => true,
            'data' => new GovernorateResource($governorate)
        ]);
    }

    /**
     * Update the specified governorate.
     */
    public function update(GovernorateRequest $request, $id)
    {
        $governorate = Governorate::findOrFail($id);
        $governorate->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => new GovernorateResource($governorate)
        ]);
    }

    /**
     * Remove the specified governorate.
     */
    public function destroy($id)
    {
        $governorate = Governorate::findOrFail($id);
        $governorate->delete();

        return response()->json([
            'success' => true,
            'message' => 'Governorate deleted successfully'
        ], 200);
    }

    /**
     * Public listing of governorates.
     */
    public function publicIndex(Request $request)
    {
        $query = Governorate::query();

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
        }

        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->input('per_page', 15);
        $governorates = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => GovernorateResource::collection($governorates)->toArray($request),
            'meta' => [
                'total' => $governorates->total(),
                'per_page' => $governorates->perPage(),
                'current_page' => $governorates->currentPage(),
                'last_page' => $governorates->lastPage(),
            ]
        ]);
    }

    /**
     * Public display of a governorate.
     */
    public function publicShow($id)
    {
        $governorate = Governorate::findOrFail($id);
        return response()->json([
            'success' => true,
            'data' => new GovernorateResource($governorate)
        ]);
    }
}
