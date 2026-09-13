<?php

return [
    /*
    |--------------------------------------------------------------------------
    | AI Transport Assistant — Provider Configuration
    |--------------------------------------------------------------------------
    |
    | The Wasel Egypt assistant is provider-agnostic. AI_PROVIDER selects the
    | backend implementation:
    |
    |   mock      Rule-based transport provider that answers from the REAL
    |             transit database (stops, lines, alerts, fares). No external
    |             API key required; fully demonstrable offline.
    |   openai    Any OpenAI-compatible Chat Completions endpoint (OpenAI,
    |             OpenRouter, Ollama, vLLM, self-hosted gateways...). Point
    |             AI_BASE_URL at the provider and set AI_API_KEY/AI_MODEL.
    |   disabled  The assistant honestly reports itself unavailable.
    |
    | A remote provider configured without a usable key degrades to the mock
    | provider so the assistant never breaks the product experience.
    |
    */

    'default' => env('AI_PROVIDER', 'mock'),

    'providers' => [
        'openai' => [
            'base_url' => env('AI_BASE_URL', 'https://api.openai.com/v1'),
            'api_key' => env('AI_API_KEY'),
            'model' => env('AI_MODEL', 'gpt-4o-mini'),
            'timeout' => (int) env('AI_TIMEOUT', 30),
        ],
        // Groq is OpenAI-compatible; the key lives in environment secrets
        // only (never in code, docs, or git) and degrades to mock when absent.
        'groq' => [
            'base_url' => env('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
            'api_key' => env('GROQ_API_KEY'),
            'model' => env('GROQ_MODEL', 'llama-3.3-70b-versatile'),
            'timeout' => (int) env('GROQ_TIMEOUT', 30),
        ],
    ],

    // Client-side conversation window constraints (validated server-side).
    'max_history' => 12,
    'max_message_length' => 2000,
];
