<?php

namespace App\Services\Ai;

use App\Services\Ai\Contracts\AiProvider;
use App\Services\Ai\Providers\MockTransitProvider;
use App\Services\Ai\Providers\OpenAiCompatibleProvider;

/**
 * Chooses the active assistant provider from config/ai.php. Unknown or
 * unavailable selections degrade to the offline mock transport engine so
 * the assistant never breaks the product experience.
 */
class AiProviderFactory
{
    public static function make(): AiProvider
    {
        $selected = (string) config('ai.default', 'mock');

        // Groq is OpenAI-compatible: same client class, different endpoint/model.
        $openAiCompatible = match ($selected) {
            'openai' => [
                (string) config('ai.providers.openai.base_url', 'https://api.openai.com/v1'),
                config('ai.providers.openai.api_key'),
                (string) config('ai.providers.openai.model', 'gpt-4o-mini'),
                (int) config('ai.providers.openai.timeout', 30),
            ],
            'groq' => [
                (string) config('ai.providers.groq.base_url', 'https://api.groq.com/openai/v1'),
                config('ai.providers.groq.api_key'),
                (string) config('ai.providers.groq.model', 'llama-3.3-70b-versatile'),
                (int) config('ai.providers.groq.timeout', 30),
            ],
            default => null,
        };

        $provider = match (true) {
            is_array($openAiCompatible) => new OpenAiCompatibleProvider(...$openAiCompatible),
            $selected === 'mock' => new MockTransitProvider,
            default => null, // 'disabled' or unknown value
        };

        if ($provider === null || ! $provider->isAvailable()) {
            return new MockTransitProvider;
        }

        return $provider;
    }

    /** Whether the operator explicitly turned the assistant off. */
    public static function disabled(): bool
    {
        return (string) config('ai.default', 'mock') === 'disabled';
    }
}
