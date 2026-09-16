<?php

namespace App\Services\Ai\Providers;

use App\Services\Ai\Contracts\AiProvider;
use App\Services\Ai\AiActionValidator;
use Illuminate\Support\Facades\Http;

/**
 * Provider for any OpenAI-compatible Chat Completions endpoint — OpenAI,
 * OpenRouter, Ollama, vLLM or a self-hosted gateway. The endpoint, key
 * and model are environment-driven (config/ai.php), so switching vendor
 * or pointing at our own model never touches application code.
 *
 * The model is instructed to answer with strict JSON containing the reply
 * plus proposed UI actions; actions are re-validated server-side against
 * the safe registry, so even a misbehaving model cannot drive the app.
 */
class OpenAiCompatibleProvider implements AiProvider
{
    private string $baseUrl;

    private ?string $apiKey;

    private string $model;

    private int $timeout;

    private AiActionValidator $validator;

    public function __construct(string $baseUrl, ?string $apiKey, string $model, int $timeout)
    {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
        $this->model = $model;
        $this->timeout = max(5, $timeout);
        $this->validator = new AiActionValidator;
    }

    public function id(): string
    {
        return 'openai';
    }

    public function label(): string
    {
        return 'AI model: '.$this->model;
    }

    public function isAvailable(): bool
    {
        return $this->apiKey !== null && trim($this->apiKey) !== '';
    }

    public function isSimulated(): bool
    {
        return false;
    }

    public function chat(array $messages, array $context): array
    {
        $payload = [
            'model' => $this->model,
            'messages' => [
                ['role' => 'system', 'content' => $this->systemPrompt($context)],
                ...array_map(fn (array $m) => [
                    'role' => $m['role'] === 'assistant' ? 'assistant' : 'user',
                    'content' => (string) $m['content'],
                ], $messages),
            ],
            'temperature' => 0.4,
            'max_tokens' => 700,
        ];

        $response = Http::withToken($this->apiKey ?? '')
            ->timeout($this->timeout)
            ->acceptJson()
            ->post($this->baseUrl.'/chat/completions', $payload);

        if ($response->failed()) {
            return [
                'content' => 'The AI service is temporarily unavailable. Your journeys, stops and fares all remain fully available in the app.',
                'actions' => [],
            ];
        }

        $content = (string) ($response->json('choices.0.message.content') ?? '');

        return $this->parse($content, $context);
    }

    /**
     * Split a model answer into reply text + proposed actions. Accepts raw
     * JSON or fenced JSON; falls back to treating the whole text as the
     * reply with no actions.
     *
     * @return array{content: string, actions: array<int, array<string, mixed>>}
     */
    private function parse(string $content, array $context): array
    {
        $trimmed = trim($content);
        $jsonText = $trimmed;

        if (preg_match('/```(?:json)?\s*(.+?)\s*```/s', $trimmed, $m)) {
            $jsonText = $m[1];
        }

        $decoded = json_decode($jsonText, true);

        if (is_array($decoded) && isset($decoded['reply'])) {
            return [
                'content' => mb_substr((string) $decoded['reply'], 0, 4000),
                'actions' => $this->validator->validate($decoded['actions'] ?? []),
            ];
        }

        return ['content' => $trimmed !== '' ? $trimmed : '...', 'actions' => []];
    }

    private function systemPrompt(array $context): string
    {
        $language = ($context['language'] ?? 'en') === 'ar' ? 'ar' : 'en';
        $statsJson = json_encode($context['stats'] ?? [], JSON_UNESCAPED_UNICODE);
        $alertsJson = json_encode($context['alerts'] ?? [], JSON_UNESCAPED_UNICODE);
        $journeyJson = isset($context['active_journey'])
            ? json_encode($context['active_journey'], JSON_UNESCAPED_UNICODE)
            : 'null';

        $actionList = implode("\n", array_map(
            fn (string $type, array $params) => '  - '.$type.($params !== [] ? ' (params: '.implode(', ', array_keys($params)).')' : ''),
            array_keys(AiActionValidator::REGISTRY),
            array_values(AiActionValidator::REGISTRY)
        ));

        return <<<PROMPT
        You are "Wasel Assistant", the transportation assistant inside the Wasel Egypt
        transit platform (Cairo). You help users plan journeys, understand metro lines,
        fares and nearby stops, and react to service alerts.

        REAL NETWORK CONTEXT (use these facts; never invent others):
        {$statsJson}
        ACTIVE ALERTS: {$alertsJson}
        ACTIVE JOURNEY TELEMETRY: {$journeyJson}

        CRITICAL GROUNDING (R-03): AI is NEVER the source of truth for journey state. If
        ACTIVE JOURNEY TELEMETRY is present, you MUST strictly use its values (legIndex,
        mode, nextStop, remaining_eta_sec, progress, isDeviated, deviationDescription)
        when the user asks about their active trip, next stop, ETA, or off-route status.
        Never hallucinate stops or times that differ from this telemetry.

        USER LANGUAGE: answer strictly in {$language}.

        UI ACTIONS: you may END your answer by requesting up to 4 frontend actions from
        this whitelist only:
        {$actionList}

        OUTPUT FORMAT — return STRICT JSON, nothing else:
        {"reply": "<your answer>", "actions": [{"type": "<action>", "params": {...}}]}

        Rules: stops passed in context are real (use their ids for set_origin /
        set_destination / open_stop). Fares for metro come from the TfC 2024 matrix;
        bus/microbus fares are demo/estimated — say so honestly. If you don't know
        something, say so and suggest the relevant app surface.
        PROMPT;
    }
}
