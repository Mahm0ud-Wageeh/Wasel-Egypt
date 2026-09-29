<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Requests\LocationUpdateRequest;
use App\Http\Requests\RecoveryOptionsRequest;
use App\Http\Requests\StartJourneyRequest;
use App\Http\Resources\ActiveJourneyResource;
use App\Http\Resources\DeviationEventResource;
use App\Http\Resources\JourneyProgressResource;
use App\Http\Resources\RecoveryRouteResource;
use App\Models\ActiveJourney;
use App\Models\DeviationEvent;
use App\Models\Journey;
use App\Models\RecoveryRoute;
use App\Services\Journey\DeviationDetectionService;
use App\Services\Journey\JourneyExecutionService;
use App\Services\Journey\JourneyTrackingService;
use App\Services\Journey\RecoveryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use InvalidArgumentException;

class ActiveJourneyController extends AuthController
{
    public function __construct(
        private JourneyExecutionService $execution,
        private JourneyTrackingService $tracking,
        private RecoveryService $recovery,
        private DeviationDetectionService $deviationDetection,
    ) {
    }

    /**
     * Start executing a saved/planned journey (owner only).
     */
    public function start(StartJourneyRequest $request, $journeyId)
    {
        $journey = Journey::find($journeyId);

        if (!$journey) {
            return $this->notFound('Journey not found');
        }

        if ($journey->user_id !== Auth::id()) {
            return $this->forbidden('Only the journey owner can start it.');
        }

        try {
            $activeJourney = $this->execution->start(
                Auth::user(),
                $journey,
                $request->validated()['started_at'] ?? null,
            );
        } catch (InvalidArgumentException $e) {
            return $this->conflict($e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Journey started successfully',
            'data' => (new ActiveJourneyResource(
                $activeJourney->load('journey.journeyLegs.transitStopFrom', 'journey.journeyLegs.transitStopTo', 'journey.journeyLegs.routeVariant.route')
            ))->withTracking($this->tracking->currentState($activeJourney)),
        ], 201);
    }

    /**
     * List the authenticated user's active journeys (admins see all).
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = ActiveJourney::with([
            'journey.journeyLegs.transitStopFrom',
            'journey.journeyLegs.transitStopTo',
            'journey.journeyLegs.routeVariant.route',
            'latestJourneyProgress',
            'latestDeviationEvent',
        ]);

        if ($user->hasRole('admin')) {
            if ($request->has('user_id')) {
                $query->where('user_id', $request->input('user_id'));
            }
        } else {
            $query->where('user_id', $user->id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        } else {
            $query->where('status', 'active');
        }

        $activeJourneys = $query->orderBy('started_at', 'desc')->paginate($request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => ActiveJourneyResource::collection($activeJourneys->items())->map(
                fn (ActiveJourneyResource $resource) => $resource->withTracking(
                    $this->tracking->currentState($resource->resource)
                )
            ),
            'meta' => [
                'current_page' => $activeJourneys->currentPage(),
                'last_page' => $activeJourneys->lastPage(),
                'per_page' => $activeJourneys->perPage(),
                'total' => $activeJourneys->total(),
            ],
        ]);
    }

    /**
     * Show an active journey with its tracking state (owner or admin).
     */
    public function show($id)
    {
        $forbidden = $this->authorizeActiveJourney($id);
        if ($forbidden !== null) {
            return $forbidden;
        }

        $activeJourney = ActiveJourney::with('journey.journeyLegs.transitStopFrom', 'journey.journeyLegs.transitStopTo', 'journey.journeyLegs.routeVariant.route')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => (new ActiveJourneyResource($activeJourney))
                ->withTracking($this->tracking->currentState($activeJourney)),
        ]);
    }

    /**
     * Record a location update and return the recomputed tracking state.
     */
    public function updateLocation(LocationUpdateRequest $request, $id)
    {
        $response = $this->authorizeMutableActiveJourney($id);
        if ($response !== null) {
            return $response;
        }

        $activeJourney = ActiveJourney::findOrFail($id);

        try {
            $result = $this->tracking->updateLocation($activeJourney, $request->validated());
        } catch (InvalidArgumentException $e) {
            return $this->conflict($e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Location recorded successfully',
            'data' => array_merge(
                (new ActiveJourneyResource($result['active_journey']->load('journey.journeyLegs')))->withTracking($result['tracking'])->toArray(request()),
                ['progress' => new JourneyProgressResource($result['progress'])],
                ['gap_ack' => $result['gap_ack'] ?? ['accepted' => true, 'duplicate' => false, 'backfill' => false, 'client_seq' => null]],
                $result['deviation_event'] !== null ? [
                    'deviation' => new DeviationEventResource($result['deviation_event']),
                ] : [],
            ),
        ]);
    }

    /**
     * Deviation events for an active journey, with their recovery routes
     * (owner or admin).
     */
    public function deviations($id)
    {
        $forbidden = $this->authorizeActiveJourney($id);
        if ($forbidden !== null) {
            return $forbidden;
        }

        $activeJourney = ActiveJourney::findOrFail($id);

        $events = $activeJourney->deviationEvents()
            ->with(['expectedStop', 'recoveryRoutes.alternativeJourney.journeyLegs.transitStopFrom', 'recoveryRoutes.alternativeJourney.journeyLegs.transitStopTo', 'recoveryRoutes.alternativeJourney.journeyLegs.routeVariant.route'])
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => DeviationEventResource::collection($events),
        ]);
    }

    /**
     * List previously generated recovery options (owner or admin).
     */
    public function listRecoveryOptions($id)
    {
        $forbidden = $this->authorizeActiveJourney($id);
        if ($forbidden !== null) {
            return $forbidden;
        }

        $activeJourney = ActiveJourney::findOrFail($id);

        $options = RecoveryRoute::whereHas('deviationEvent', function ($query) use ($activeJourney) {
                $query->where('active_journey_id', $activeJourney->id);
            })
            ->with(['alternativeJourney.journeyLegs.transitStopFrom', 'alternativeJourney.journeyLegs.transitStopTo', 'alternativeJourney.journeyLegs.routeVariant.route', 'deviationEvent'])
            ->orderBy('estimated_delay_sec')
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => RecoveryRouteResource::collection($options),
        ]);
    }

    /**
     * Generate recovery options for the current deviation (owner only).
     * Unaccepted options from a previous generation are replaced.
     */
    public function generateRecoveryOptions(RecoveryOptionsRequest $request, $id)
    {
        $response = $this->authorizeMutableActiveJourney($id);
        if ($response !== null) {
            return $response;
        }

        $activeJourney = ActiveJourney::findOrFail($id);

        $event = $activeJourney->deviationEvents()
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->first();

        if ($event === null) {
            return $this->conflict('No deviation event exists for this journey.');
        }

        try {
            $options = $this->recovery->generateOptions(
                $activeJourney,
                $event,
                (int) ($request->validated()['max_options'] ?? RecoveryService::MAX_OPTIONS),
            );
        } catch (InvalidArgumentException $e) {
            return $this->conflict($e->getMessage());
        }

        foreach ($options as $option) {
            $option->load('alternativeJourney.journeyLegs.transitStopFrom', 'alternativeJourney.journeyLegs.transitStopTo', 'alternativeJourney.journeyLegs.routeVariant.route');
        }

        return response()->json([
            'success' => true,
            'message' => count($options) > 0
                ? 'Recovery options generated successfully'
                : 'No recovery options could be generated from the deviation point.',
            'data' => RecoveryRouteResource::collection(collect($options))
                ->toArray(request()),
        ]);
    }

    /**
     * Accept a recovery option: reroute the active journey onto the
     * alternative plan (owner only).
     */
    public function acceptRecovery($id, $recoveryId)
    {
        $response = $this->authorizeMutableActiveJourney($id);
        if ($response !== null) {
            return $response;
        }

        $activeJourney = ActiveJourney::findOrFail($id);
        $recoveryRoute = RecoveryRoute::find($recoveryId);

        if (!$recoveryRoute) {
            return $this->notFound('Recovery option not found');
        }

        try {
            $activeJourney = $this->recovery->accept($activeJourney, $recoveryRoute);
        } catch (InvalidArgumentException $e) {
            return $this->conflict($e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Journey rerouted successfully',
            'data' => (new ActiveJourneyResource($activeJourney->load('journey.journeyLegs.transitStopFrom', 'journey.journeyLegs.transitStopTo', 'journey.journeyLegs.routeVariant.route')))
                ->withTracking($this->tracking->currentState($activeJourney)),
        ]);
    }

    /**
     * Resume a deviated journey without rerouting, when the deviation allows
     * continuing (owner only).
     */
    public function resume($id)
    {
        $response = $this->authorizeMutableActiveJourney($id);
        if ($response !== null) {
            return $response;
        }

        $activeJourney = ActiveJourney::findOrFail($id);

        $event = $activeJourney->deviationEvents()
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->first();

        try {
            $activeJourney = $this->execution->resume(
                $activeJourney,
                $event !== null && $this->deviationDetection->canContinue($event),
            );
        } catch (InvalidArgumentException $e) {
            return $this->conflict($e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Journey resumed successfully',
            'data' => (new ActiveJourneyResource($activeJourney->load('journey.journeyLegs.transitStopFrom', 'journey.journeyLegs.transitStopTo', 'journey.journeyLegs.routeVariant.route')))
                ->withTracking($this->tracking->currentState($activeJourney)),
        ]);
    }

    /**
     * Progress history for an active journey (owner or admin).
     */
    public function progress($id)
    {
        $forbidden = $this->authorizeActiveJourney($id);
        if ($forbidden !== null) {
            return $forbidden;
        }

        $activeJourney = ActiveJourney::with('journey.journeyLegs.transitStopFrom', 'journey.journeyLegs.transitStopTo', 'journey.journeyLegs.routeVariant.route')->findOrFail($id);

        $history = $activeJourney->journeyProgress()
            ->orderByDesc('recorded_at')
            ->orderByDesc('id')
            ->paginate(request()->input('per_page', 50));

        return response()->json([
            'success' => true,
            'data' => (new ActiveJourneyResource($activeJourney))
                ->withTracking($this->tracking->currentState($activeJourney))->toArray(request()),
            'progress_history' => JourneyProgressResource::collection($history->items()),
            'meta' => [
                'current_page' => $history->currentPage(),
                'last_page' => $history->lastPage(),
                'per_page' => $history->perPage(),
                'total' => $history->total(),
            ],
        ]);
    }

    /**
     * Complete an active journey (owner only).
     */
    public function complete($id)
    {
        $response = $this->authorizeMutableActiveJourney($id);
        if ($response !== null) {
            return $response;
        }

        try {
            $activeJourney = $this->execution->complete(ActiveJourney::findOrFail($id));
        } catch (InvalidArgumentException $e) {
            return $this->conflict($e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Journey completed successfully',
            'data' => (new ActiveJourneyResource($activeJourney->load('journey.journeyLegs.transitStopFrom', 'journey.journeyLegs.transitStopTo', 'journey.journeyLegs.routeVariant.route')))
                ->withTracking($this->tracking->currentState($activeJourney)),
        ]);
    }

    /**
     * Cancel an active journey (owner only).
     */
    public function cancel($id)
    {
        $response = $this->authorizeMutableActiveJourney($id);
        if ($response !== null) {
            return $response;
        }

        try {
            $activeJourney = $this->execution->cancel(ActiveJourney::findOrFail($id));
        } catch (InvalidArgumentException $e) {
            return $this->conflict($e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Journey cancelled successfully',
            'data' => (new ActiveJourneyResource($activeJourney->load('journey.journeyLegs.transitStopFrom', 'journey.journeyLegs.transitStopTo', 'journey.journeyLegs.routeVariant.route')))
                ->withTracking($this->tracking->currentState($activeJourney)),
        ]);
    }

    /**
     * Owner-or-admin authorization for read access.
     */
    private function authorizeActiveJourney($id): ?JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return $this->unauthenticated();
        }

        $activeJourney = ActiveJourney::find($id);

        if (!$activeJourney) {
            return $this->notFound('Active journey not found');
        }

        if ($activeJourney->user_id !== $user->id && !$user->hasRole('admin')) {
            return $this->forbidden('Unauthorized');
        }

        return null;
    }

    /**
     * Owner-only authorization for state-changing actions.
     */
    private function authorizeMutableActiveJourney($id): ?JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return $this->unauthenticated();
        }

        $activeJourney = ActiveJourney::find($id);

        if (!$activeJourney) {
            return $this->notFound('Active journey not found');
        }

        if ($activeJourney->user_id !== $user->id) {
            return $this->forbidden('Only the journey owner can perform this action.');
        }

        return null;
    }

    private function unauthenticated(): JsonResponse
    {
        return \App\Support\ApiError::response('unauthenticated', 401, 'Unauthenticated');
    }

    private function notFound(string $message): JsonResponse
    {
        return \App\Support\ApiError::response('not_found', 404, $message);
    }

    private function forbidden(string $message): JsonResponse
    {
        return \App\Support\ApiError::response('forbidden', 403, $message);
    }

    private function conflict(string $message): JsonResponse
    {
        return \App\Support\ApiError::response('conflict', 409, $message);
    }
}
