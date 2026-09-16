<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Controller;
use App\Models\TransitOperator;
use Illuminate\Http\Request;
use App\Http\Requests\TransitOperatorRequest;
use App\Http\Resources\TransitOperatorResource;

class TransitOperatorController extends Controller
{
    /**
     * Display a listing of transit operators.
     */
    public function index(Request $request)
    {
        $query = TransitOperator::query();

        // Search functionality
        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sorting
        $allowedSortColumns = ['id', 'name', 'short_name', 'code', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'name';
        $sortOrder = strtolower((string) $request->input('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
        $transitOperators = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => TransitOperatorResource::collection($transitOperators)->toArray($request),
            'meta' => [
                'total' => $transitOperators->total(),
                'per_page' => $transitOperators->perPage(),
                'current_page' => $transitOperators->currentPage(),
                'last_page' => $transitOperators->lastPage(),
            ]
        ]);
    }

    /**
     * Store a newly created transit operator.
     */
    public function store(TransitOperatorRequest $request)
    {
        $transitOperator = TransitOperator::create($request->validated());

        return response()->json([
            'success' => true,
            'data' => new TransitOperatorResource($transitOperator)
        ], 201);
    }

    /**
     * Display the specified transit operator.
     */
    public function show($id)
    {
        $transitOperator = TransitOperator::findOrFail($id);
        return response()->json([
            'success' => true,
            'data' => new TransitOperatorResource($transitOperator)
        ]);
    }

    /**
     * Update the specified transit operator.
     */
    public function update(TransitOperatorRequest $request, $id)
    {
        $transitOperator = TransitOperator::findOrFail($id);
        $transitOperator->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => new TransitOperatorResource($transitOperator)
        ]);
    }

    /**
     * Remove the specified transit operator.
     */
    public function destroy($id)
    {
        $transitOperator = TransitOperator::findOrFail($id);
        $transitOperator->delete();

        return response()->json([
            'success' => true,
            'message' => 'Transit operator deleted successfully'
        ], 200);
    }

    /**
     * Public listing of transit operators.
     */
    public function publicIndex(Request $request)
    {
        $query = TransitOperator::query();

        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $allowedSortColumns = ['id', 'name', 'short_name', 'code', 'created_at', 'updated_at'];
        $sortBy = in_array($request->input('sort_by'), $allowedSortColumns, true) ? $request->input('sort_by') : 'name';
        $sortOrder = strtolower((string) $request->input('sort_order', 'asc')) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortOrder);

        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
        $transitOperators = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => TransitOperatorResource::collection($transitOperators)->toArray($request),
            'meta' => [
                'total' => $transitOperators->total(),
                'per_page' => $transitOperators->perPage(),
                'current_page' => $transitOperators->currentPage(),
                'last_page' => $transitOperators->lastPage(),
            ]
        ]);
    }

    /**
     * Public display of a transit operator.
     */
    public function publicShow($id)
    {
        $transitOperator = TransitOperator::findOrFail($id);
        return response()->json([
            'success' => true,
            'data' => new TransitOperatorResource($transitOperator)
        ]);
    }
}