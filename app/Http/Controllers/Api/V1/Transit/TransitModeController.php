<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Api\V1\AuthController;
use App\Models\TransitMode;
use Illuminate\Http\Request;
use App\Http\Requests\TransitModeRequest;
use App\Http\Resources\TransitModeResource;

class TransitModeController extends AuthController
{
    /**
     * Display a listing of transit modes.
     */
    public function index(Request $request)
    {
        $query = TransitMode::query();

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
        $transitModes = $query->paginate($perPage);

        return TransitModeResource::collection($transitModes);
    }

    /**
     * Store a newly created transit mode.
     */
    public function store(TransitModeRequest $request)
    {
        $transitMode = TransitMode::create($request->validated());

        return response()->json([
            'success' => true,
            'data' => new TransitModeResource($transitMode)
        ], 201);
    }

    /**
     * Display the specified transit mode.
     */
    public function show(TransitMode $transitMode)
    {
        return response()->json([
            'success' => true,
            'data' => new TransitModeResource($transitMode)
        ]);
    }

    /**
     * Update the specified transit mode.
     */
    public function update(TransitModeRequest $request, TransitMode $transitMode)
    {
        $transitMode->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => new TransitModeResource($transitMode)
        ]);
    }

    /**
     * Remove the specified transit mode.
     */
    public function destroy(TransitMode $transitMode)
    {
        $transitMode->delete();

        return response()->json([
            'success' => true,
            'message' => 'Transit mode deleted successfully'
        ], 200);
    }

    /**
     * Public listing of transit modes.
     */
    public function publicIndex(Request $request)
    {
        $query = TransitMode::query();

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }

        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->input('per_page', 15);
        $transitModes = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => TransitModeResource::collection($transitModes)->toArray($request),
            'meta' => [
                'total' => $transitModes->total(),
                'per_page' => $transitModes->perPage(),
                'current_page' => $transitModes->currentPage(),
                'last_page' => $transitModes->lastPage(),
            ]
        ]);
    }

    /**
     * Public display of a transit mode.
     */
    public function publicShow(TransitMode $transitMode)
    {
        return response()->json([
            'success' => true,
            'data' => (new TransitModeResource($transitMode))->toArray(request())
        ]);
    }
}