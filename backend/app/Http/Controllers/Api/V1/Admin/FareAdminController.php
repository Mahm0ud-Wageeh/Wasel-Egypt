<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Fare;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin management for published fares. Demo/estimated rows exist so the
 * product can be demonstrated honestly; administrators may correct or
 * replace them with real figures here without touching code.
 */
class FareAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Fare::query()
            ->with(['transitMode:id,name', 'transitOperator:id,name', 'route:id,short_name,long_name']);

        if ($request->filled('data_status')) {
            $query->where('data_status', $request->input('data_status'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('search')) {
            $search = (string) $request->input('search');
            $query->where(fn ($q) => $q->where('label', 'like', "%{$search}%")->orWhere('tier', 'like', "%{$search}%"));
        }

        $perPage = min(100, max(1, (int) $request->input('per_page', 25)));

        return response()->json($query->orderBy('transit_mode_id')->orderBy('amount')->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        $fare = Fare::create($this->rules($request));

        return response()->json($fare->load(['transitMode:id,name', 'transitOperator:id,name']), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $fare = Fare::findOrFail($id);
        $fare->update($this->rules($request, $fare->id));

        return response()->json($fare->fresh(['transitMode:id,name', 'transitOperator:id,name']));
    }

    public function destroy(int $id): JsonResponse
    {
        $fare = Fare::findOrFail($id);
        $fare->delete();

        return response()->json(['deleted' => true]);
    }

    private function rules(Request $request, ?int $id = null): array
    {
        $validated = $request->validate([
            'transit_mode_id' => ['nullable', 'integer', 'exists:transit_modes,id'],
            'transit_operator_id' => ['nullable', 'integer', 'exists:transit_operators,id'],
            'route_id' => ['nullable', 'integer', 'exists:routes,id'],
            'label' => ['required', 'string', 'max:160'],
            'tier' => ['nullable', 'string', 'max:40'],
            'origin_stop_id' => ['nullable', 'integer', 'exists:transit_stops,id'],
            'destination_stop_id' => ['nullable', 'integer', 'exists:transit_stops,id'],
            'zone' => ['nullable', 'string', 'max:40'],
            'distance_min_km' => ['nullable', 'numeric', 'min:0'],
            'distance_max_km' => ['nullable', 'numeric', 'min:0', 'gte:distance_min_km'],
            'amount' => ['required', 'numeric', 'min:0', 'max:999999'],
            'currency' => ['nullable', 'string', 'size:3'],
            'student_amount' => ['nullable', 'numeric', 'min:0'],
            'senior_amount' => ['nullable', 'numeric', 'min:0'],
            'card_type' => ['nullable', 'string', 'max:40'],
            'effective_from' => ['nullable', 'date'],
            'effective_until' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'source' => ['nullable', 'string', 'max:60'],
            'confidence' => ['nullable', Rule::in(['verified', 'estimated'])],
            'data_status' => ['nullable', Rule::in(['real', 'demo_estimated'])],
            'status' => ['nullable', Rule::in(['active', 'draft', 'archived'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        return collect($validated)->only([
            'transit_mode_id', 'transit_operator_id', 'route_id', 'label', 'tier',
            'origin_stop_id', 'destination_stop_id', 'zone', 'distance_min_km', 'distance_max_km',
            'amount', 'currency', 'student_amount', 'senior_amount', 'card_type',
            'effective_from', 'effective_until', 'source', 'confidence', 'data_status', 'status', 'notes',
        ])->all();
    }
}
