<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Ai\AiChatService;
use App\Services\Ai\AiProviderFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public transport-assistant endpoints. Open to guests (the landing page
 * exposes the assistant), heavily throttled, and strictly bounded in
 * payload size. Actions returned to the client are already validated
 * against the safe registry — the frontend executor never trusts anything
 * beyond this list.
 */
class AiChatController extends Controller
{
    public function __construct(private AiChatService $service)
    {
    }

    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'messages' => ['required', 'array', 'min:1', 'max:'.config('ai.max_history', 12)],
            'messages.*.role' => ['required', 'string', 'in:user,assistant'],
            'messages.*.content' => ['required', 'string', 'max:'.config('ai.max_message_length', 2000)],
            'language' => ['nullable', 'string', 'in:en,ar'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'active_journey_id' => ['nullable', 'integer', 'exists:active_journeys,id'],
        ]);

        $messages = array_values(array_map(
            fn (array $m) => ['role' => $m['role'], 'content' => $m['content']],
            $validated['messages']
        ));

        if ($messages[count($messages) - 1]['role'] !== 'user') {
            return response()->json([
                'message' => 'The last message must come from the user.',
                'errors' => ['messages' => ['The last message must come from the user.']],
            ], 422);
        }

        $activeJourneyTelemetry = null;
        if (!empty($validated['active_journey_id'])) {
            $activeJourney = \App\Models\ActiveJourney::with([
                'journey.journeyLegs.transitStopFrom',
                'journey.journeyLegs.transitStopTo',
            ])->find($validated['active_journey_id']);

            $user = $request->user('sanctum');
            if (!$user || ($activeJourney->user_id !== $user->id && !$user->hasRole('admin'))) {
                return response()->json([
                    'message' => 'Unauthorized to access active journey telemetry.',
                    'errors' => ['active_journey_id' => ['Unauthorized.']],
                ], 403);
            }

            $trackingState = app(\App\Services\Journey\JourneyTrackingService::class)->currentState($activeJourney);
            $legs = $activeJourney->journey?->journeyLegs ?? collect();
            $legIndex = $activeJourney->current_leg_index ?? 0;
            $currentLeg = $legs->firstWhere('sequence', $legIndex + 1) ?? $legs->get($legIndex);

            $activeJourneyTelemetry = [
                'id' => $activeJourney->id,
                'status' => $activeJourney->status,
                'legIndex' => $legIndex,
                'totalLegs' => $legs->count(),
                'mode' => $currentLeg?->mode ?? 'transit',
                'fromStop' => $currentLeg?->transitStopFrom?->name ?? null,
                'toStop' => $currentLeg?->transitStopTo?->name ?? null,
                'nextStop' => $trackingState['next_stop']['name'] ?? $currentLeg?->transitStopTo?->name ?? null,
                'remaining_eta_sec' => $trackingState['remaining_eta_sec'] ?? null,
                'distance_remaining_m' => $trackingState['distance_remaining_m'] ?? null,
                'progress' => (float) ($trackingState['progress_percent'] ?? $activeJourney->current_progress_percent ?? 0),
                'isDeviated' => $activeJourney->status === 'deviated' || !empty($trackingState['deviation']),
                'deviationType' => $trackingState['deviation']['type'] ?? null,
                'deviationDescription' => $trackingState['deviation']['description'] ?? null,
            ];
        }

        $payload = $this->service->handle($messages, [
            'language' => $validated['language'] ?? null,
            'lat' => isset($validated['lat']) ? (float) $validated['lat'] : null,
            'lng' => isset($validated['lng']) ? (float) $validated['lng'] : null,
            'active_journey' => $activeJourneyTelemetry,
        ]);

        // Persist to ai_conversations and ai_messages per ERD v2.1
        try {
            $user = $request->user('sanctum') ?? $request->user();
            $sessionId = (string) ($request->header('X-Session-ID') ?? $request->input('session_id') ?? ($user ? 'user_'.$user->id : 'session_'.md5($request->ip().$request->userAgent())));

            $conversation = \App\Models\AiConversation::firstOrCreate(
                ['session_id' => $sessionId],
                ['user_id' => $user?->id]
            );

            if ($user && !$conversation->user_id) {
                $conversation->update(['user_id' => $user->id]);
            }

            $lastUserMsg = end($messages);
            if ($lastUserMsg && ($lastUserMsg['role'] ?? '') === 'user') {
                $tokensIn = (int) max(1, ceil(mb_strlen($lastUserMsg['content'] ?? '') / 4));
                \App\Models\AiMessage::create([
                    'ai_conversation_id' => $conversation->id,
                    'role' => 'user',
                    'content' => $lastUserMsg['content'],
                    'model_used' => $payload['provider']['id'] ?? 'gemini-flash',
                    'tokens_in' => $tokensIn,
                    'tokens_out' => 0,
                    'created_at' => now(),
                ]);
            }

            if (!empty($payload['reply'])) {
                $tokensOut = (int) max(1, ceil(mb_strlen($payload['reply']) / 4));
                \App\Models\AiMessage::create([
                    'ai_conversation_id' => $conversation->id,
                    'role' => 'assistant',
                    'content' => $payload['reply'],
                    'model_used' => $payload['provider']['id'] ?? 'gemini-flash',
                    'tokens_in' => 0,
                    'tokens_out' => $tokensOut,
                    'created_at' => now(),
                ]);
            }

            $payload['session_id'] = $sessionId;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Could not record AI conversation history: ' . $e->getMessage());
        }

        return response()->json($payload);
    }

    public function status(): JsonResponse
    {
        if (AiProviderFactory::disabled()) {
            return response()->json([
                'available' => false,
                'provider' => ['id' => 'disabled', 'label' => 'Assistant disabled', 'simulated' => false],
            ]);
        }

        $provider = AiProviderFactory::make();

        return response()->json([
            'available' => true,
            'provider' => [
                'id' => $provider->id(),
                'label' => $provider->label(),
                'simulated' => $provider->isSimulated(),
            ],
        ]);
    }
}
