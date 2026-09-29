<?php

namespace App\Http\Controllers\Api\V1\Transit;

use App\Http\Controllers\Controller;
use App\Models\Fare;
use App\Services\Journey\FareEstimator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public fare information surface. Every row carries its data_status so
 * the product can honestly distinguish REAL fares (imported TfC matrix)
 * from DEMO/ESTIMATED seeds. Pair pricing for metro journeys is answered
 * exactly from the same matrix the journey planner uses.
 */
class FareController extends Controller
{
    public function __construct(private FareEstimator $estimator)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Fare::query()
            ->active()
            ->with(['transitMode:id,name,icon', 'transitOperator:id,name']);

        if ($request->filled('mode')) {
            $modeName = (string) $request->input('mode');
            $query->whereHas('transitMode', fn ($q) => $q->where('name', $modeName));
        }

        $fares = $query
            ->orderBy('transit_mode_id')
            ->orderBy('amount')
            ->get([
                'id', 'transit_mode_id', 'transit_operator_id', 'route_id',
                'label', 'tier', 'zone', 'distance_min_km', 'distance_max_km',
                'amount', 'currency', 'student_amount', 'senior_amount',
                'card_type', 'effective_from', 'effective_until',
                'source', 'confidence', 'data_status', 'notes',
            ]);

        return response()->json([
            'data' => $fares,
            'meta' => [
                'data_status_legend' => [
                    'real' => 'Imported from an authoritative source.',
                    'demo_estimated' => 'Demo / Estimated — editable by administrators.',
                ],
            ],
        ]);
    }

    /**
     * Honest pair pricing: GET /fares/estimate?origin={stop_id}&destination={stop_id}
     * Returns a fare only when one can be produced from real data; otherwise
     * it says why not (unknown pair, non-metro journey cannot be priced).
     */
    public function estimate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'origin' => ['required', 'integer', 'exists:transit_stops,id'],
            'destination' => ['required', 'integer', 'exists:transit_stops,id', 'different:origin'],
        ]);

        $estimate = $this->estimator->estimateForStops(
            (int) $validated['origin'],
            (int) $validated['destination'],
        );

        if ($estimate === null) {
            return response()->json([
                'data' => null,
                'meta' => [
                    'available' => false,
                    'reason' => 'no_verified_pair_fare',
                    'message' => 'No verified fare exists for this pair. Metro-to-metro pairs are priced from the TfC matrix; journeys involving other modes have no official fare data.',
                ],
            ]);
        }

        return response()->json([
            'data' => $estimate,
            'meta' => ['available' => true],
        ]);
    }
}
