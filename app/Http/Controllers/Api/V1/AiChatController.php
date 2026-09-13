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

        $payload = $this->service->handle($messages, [
            'language' => $validated['language'] ?? null,
            'lat' => isset($validated['lat']) ? (float) $validated['lat'] : null,
            'lng' => isset($validated['lng']) ? (float) $validated['lng'] : null,
        ]);

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
