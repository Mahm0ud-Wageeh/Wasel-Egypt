<?php

namespace App\Services\Ai\Contracts;

/**
 * Contract for transport-assistant language providers. Every provider
 * receives the normalised conversation plus real network context and
 * returns the assistant reply together with structured actions for the
 * frontend action executor. Providers never manipulate the application
 * directly — proposed actions are re-validated server-side against the
 * safe registry (AiActionValidator) before leaving the API.
 */
interface AiProvider
{
    /**
     * @param  array<int, array{role: string, content: string}>  $messages  Oldest first; the last message is the user's.
     * @param  array  $context  Real network context (stats, active alerts, user language, optional position).
     * @return array{content: string, actions: array<int, array<string, mixed>>}
     */
    public function chat(array $messages, array $context): array;

    /** Whether this provider can currently answer (key configured, etc.). */
    public function isAvailable(): bool;

    /** Stable identifier reported to clients (mock, openai, ...). */
    public function id(): string;

    /** Human-readable label for honest UI disclosure. */
    public function label(): string;

    /** True when answers come from a rule engine rather than a live model. */
    public function isSimulated(): bool;
}
