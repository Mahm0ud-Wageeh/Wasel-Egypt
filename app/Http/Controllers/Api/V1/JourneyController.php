<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Requests\JourneySearchRequest;
use App\Http\Requests\JourneyStoreRequest;
use App\Http\Resources\JourneyPlanResource;
use App\Http\Resources\JourneyResource;
use App\Models\Journey;
use App\Models\User;
use App\Repositories\Contracts\JourneyRepositoryInterface;
use App\Services\Journey\JourneyPlannerService;
use App\Services\Journey\JourneyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class JourneyController extends AuthController
{
    public function __construct(
        private JourneyPlannerService $planner,
        private JourneyService $journeys,
        private JourneyRepositoryInterface $repository,
    ) {
    }

    /**
     * Search ranked journey options between an origin and a destination.
     * Results are not persisted.
     */
    public function search(JourneySearchRequest $request)
    {
        $result = $this->planner->search(Auth::user(), $request->validated());

        return response()->json([
            'success' => true,
            'data' => array_merge($result, [
                'options' => JourneyPlanResource::collection($result['options']),
            ]),
        ]);
    }

    /**
     * Save a journey from a deterministic re-plan of the same search
     * parameters, persisting the selected option (default: best option).
     */
    public function store(JourneyStoreRequest $request)
    {
        $params = $request->validated();
        $optionIndex = (int) ($params['option_index'] ?? 0);

        $result = $this->planner->search(Auth::user(), $params);

        if (empty($result['options'])) {
            return response()->json([
                'success' => false,
                'message' => 'No journey options found for the given origin and destination.',
            ], 404);
        }

        if (!isset($result['options'][$optionIndex])) {
            return response()->json([
                'success' => false,
                'message' => "Journey option {$optionIndex} does not exist for this search.",
            ], 422);
        }

        $journey = $this->journeys->createFromPlan(
            Auth::user(),
            $result['options'][$optionIndex],
            [
                'origin_lat' => $params['origin_lat'],
                'origin_lng' => $params['origin_lng'],
                'destination_lat' => $params['destination_lat'],
                'destination_lng' => $params['destination_lng'],
                'requested_at' => $result['requested_at'],
            ],
        );

        return response()->json([
            'success' => true,
            'message' => 'Journey created successfully',
            'data' => new JourneyResource($journey->load(['journeyLegs', 'transfers'])),
        ], 201);
    }

    /**
     * List journeys for the authenticated user (admins may filter by user_id).
     */
    public function index(Request $request)
    {
        $authUser = Auth::user();

        $filters = ['per_page' => (int) $request->input('per_page', 15)];

        if (!$authUser->hasRole('admin')) {
            $filters['scope_user_id'] = $authUser->id;
        } elseif ($request->has('user_id')) {
            $filters['user_id'] = $request->input('user_id');
        }

        if ($request->has('status')) {
            $filters['status'] = $request->input('status');
        }

        $journeys = $this->repository->paginate($filters);

        return response()->json([
            'success' => true,
            'data' => JourneyResource::collection($journeys->items()),
            'meta' => [
                'current_page' => $journeys->currentPage(),
                'last_page' => $journeys->lastPage(),
                'per_page' => $journeys->perPage(),
                'total' => $journeys->total(),
            ],
        ]);
    }

    /**
     * Show full journey details (legs and transfers). Owner or admin only.
     */
    public function show($id)
    {
        $forbidden = $this->authorizeJourney($id);
        if ($forbidden !== null) {
            return $forbidden;
        }

        $journey = $this->repository->findWithLegs((int) $id);

        if (!$journey) {
            return response()->json(['success' => false, 'message' => 'Journey not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new JourneyResource($journey),
        ]);
    }

    /**
     * Re-plan alternatives for a saved journey's origin/destination and
     * requested time, marking the option that matches the saved journey.
     */
    public function alternatives($id)
    {
        $forbidden = $this->authorizeJourney($id);
        if ($forbidden !== null) {
            return $forbidden;
        }

        $journey = Journey::with('journeyLegs')->findOrFail($id);

        $result = $this->planner->plan(
            (float) $journey->origin_lat,
            (float) $journey->origin_lng,
            (float) $journey->destination_lat,
            (float) $journey->destination_lng,
            Auth::user()->preferences()->first(),
            $journey->requested_at->copy(),
            5,
        );

        $savedSignature = $journey->journeyLegs
            ->filter(fn ($leg) => $leg->route_variant_id !== null)
            ->map(fn ($leg) => $leg->route_variant_id.':'.$leg->transit_stop_from_id.':'.$leg->transit_stop_to_id)
            ->implode('|');

        $options = collect($result)->map(function (array $plan) use ($savedSignature) {
            $signature = collect($plan['legs'])
                ->filter(fn (array $leg) => $leg['type'] === 'transit')
                ->map(fn (array $leg) => $leg['route_variant_id'].':'.$leg['from_stop']['id'].':'.$leg['to_stop']['id'])
                ->implode('|');

            $plan['matches_saved'] = $signature === $savedSignature && $savedSignature !== '';

            return $plan;
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'journey_id' => (int) $id,
                'options' => JourneyPlanResource::collection($options),
            ],
        ]);
    }

    /**
     * Delete a journey. Owner or admin only.
     */
    public function destroy($id)
    {
        $forbidden = $this->authorizeJourney($id);
        if ($forbidden !== null) {
            return $forbidden;
        }

        $journey = Journey::findOrFail($id);
        $journey->delete();

        return response()->json([
            'success' => true,
            'message' => 'Journey deleted successfully',
        ]);
    }

    /**
     * Authorization for journey-scoped actions: the owner or an admin.
     * Returns a JSON error response, or null when authorized.
     */
    private function authorizeJourney($id): ?\Illuminate\Http\JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        $journey = $this->repository->find((int) $id);

        if (!$journey) {
            return response()->json([
                'success' => false,
                'message' => 'Journey not found',
            ], 404);
        }

        if ($journey->user_id !== $user->id && !$user->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        return null;
    }
}
