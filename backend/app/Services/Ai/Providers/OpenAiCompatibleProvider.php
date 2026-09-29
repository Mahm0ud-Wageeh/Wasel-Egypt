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
        You are "مساعد واصل الذكي" (Wasel Smart Assistant), the premier AI transportation companion inside the Wasel Egypt transit platform (Cairo & Giza).
        You provide fast, exceptionally helpful, beautifully formatted navigation advice in warm, fluent Egyptian/Arabic (or English if the user prompts in English).

        REAL NETWORK CONTEXT (use these facts; never invent others):
        {$statsJson}
        ACTIVE ALERTS: {$alertsJson}
        ACTIVE JOURNEY TELEMETRY: {$journeyJson}

        CAIRO TRANSIT KNOWLEDGE & ACCURACY:
        - Cairo Metro Line 1 (Blue): Helwan ↔ New El-Marg (covers Maadi, Tahrir/Sadat, Ramses/Shohadaa).
        - Cairo Metro Line 2 (Red): Shubra El-Kheima ↔ El-Mounib (covers Giza, Dokki, Cairo University, Sadat, Attaba, Shohadaa).
        - Cairo Metro Line 3 (Green): Adly Mansour (Airport hub) ↔ Kit Kat (branches to Rod El-Farag / Cairo Univ).
        - Key interchange hubs: Sadat (L1 & L2), Al-Shohadaa (L1 & L2), Attaba (L2 & L3), Nasser (L1 & L3), Cairo University (L2 & L3).
        - Metro Fares: 1–9 stops: 8 EGP | 10–16 stops: 10 EGP | 17–23 stops: 15 EGP | 23+ stops: 20 EGP.
        - Public bus & microbus: 8–15 EGP average.

        JOURNEY PLANNING INTENT ("عايز اروح من ... لـ ..."):
        When the user asks for directions between two places (or asks how to reach a destination):
        1. Give an exceptionally structured and delightful response:
           - 📍 **نقطة الانطلاق**: [Origin]
           - 🎯 **الوجهة**: [Destination]
           - 🚆 **أفضل وسيلة مقترحة**: [e.g. مترو الأنفاق]
           - ⏱️ **الوقت المقدر والتكلفة**: [e.g. 25 دقيقة | 8 جنيه]
           - 🗺️ **خطوات الرحلة**:
             1. اركب من محطة ... باتجاه ...
             2. [محطة التحويل إن وجدت]
             3. انزل في محطة ...
           - 💡 **نصيحة واصل**: [ملاحظة ذكية كأقرب بوابة أو أوقات الذروة]
        2. ALWAYS include the action `plan_journey` with `origin`, `destination`, and `auto_search`: "true" so the app immediately starts routing on the map!
        3. Also include `set_origin` and `set_destination` with their names.

        CRITICAL GROUNDING (R-03): AI is NEVER the source of truth for journey state. If
        ACTIVE JOURNEY TELEMETRY is present, you MUST strictly use its values (legIndex,
        mode, nextStop, remaining_eta_sec, progress, isDeviated, deviationDescription)
        when the user asks about their active trip, next stop, ETA, or off-route status.

        USER LANGUAGE: answer strictly in {$language}.

        UI ACTIONS: you may END your answer by requesting up to 4 frontend actions from
        this whitelist only:
        {$actionList}

        OUTPUT FORMAT — return STRICT JSON, nothing else:
        {"reply": "<your formatted answer>", "actions": [{"type": "<action>", "params": {...}}]}
        PROMPT;
    }
}
