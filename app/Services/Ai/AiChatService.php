<?php

namespace App\Services\Ai;

use App\Models\ServiceAlert;
use App\Models\TransitStop;
use Illuminate\Support\Facades\Cache;

/**
 * Orchestrates a transport-assistant turn: trims the conversation window,
 * builds real network context for the provider, executes it and returns a
 * response whose actions have already passed the safe whitelist.
 */
class AiChatService
{
    public function __construct(private AiActionValidator $validator)
    {
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $messages
     * @param  array{language?: string, lat?: float|null, lng?: float|null}  $options
     * @return array{available: bool, reply?: string, actions?: array, provider?: array, provider_id?: string}
     */
    public function handle(array $messages, array $options = []): array
    {
        if (AiProviderFactory::disabled()) {
            return ['available' => false, 'provider_id' => 'disabled'];
        }

        $provider = AiProviderFactory::make();

        $context = [
            'language' => $options['language'] ?? null,
            'lat' => $options['lat'] ?? null,
            'lng' => $options['lng'] ?? null,
            'stats' => $this->networkStats(),
            'alerts' => $this->activeAlertsSummary(),
            'active_journey' => $options['active_journey'] ?? null,
        ];

        try {
            $result = $provider->chat($messages, $context);
        } catch (\Throwable $e) {
            report($e);

            return [
                'available' => true,
                'reply' => 'The assistant hit an unexpected error. Everything else in Wasel keeps working — try again in a moment.',
                'actions' => [],
                'provider' => $this->providerMeta($provider),
            ];
        }

        return [
            'available' => true,
            'reply' => (string) ($result['content'] ?? ''),
            'actions' => $this->validator->validate($result['actions'] ?? []),
            'provider' => $this->providerMeta($provider),
        ];
    }

    private function providerMeta($provider): array
    {
        return [
            'id' => $provider->id(),
            'label' => $provider->label(),
            'simulated' => $provider->isSimulated(),
        ];
    }

    /** Compact, cached network facts handed to model-based providers. */
    private function networkStats(): array
    {
        return Cache::remember('ai.network_stats', 300, function () {
            return [
                'network' => [
                    'stops' => TransitStop::query()->count(),
                    'routes' => \App\Models\Route::query()->where('active', true)->count(),
                    'modes' => \App\Models\TransitMode::query()->count(),
                ],
                'fares_note' => 'Metro fares: TfC matrix (8/10/15/20 EGP tiers). Bus fares: demo/estimated.',
            ];
        });
    }

    private function activeAlertsSummary(): array
    {
        $now = now();

        return ServiceAlert::query()
            ->where('active_period_start', '<=', $now)
            ->where(function ($q) use ($now) {
                $q->whereNull('active_period_end')->orWhere('active_period_end', '>=', $now);
            })
            ->orderBy('active_period_start', 'desc')
            ->limit(5)
            ->get(['id', 'header_text', 'severity'])
            ->map(fn (ServiceAlert $a) => [
                'id' => $a->id,
                'header' => $a->header_text,
                'severity' => $a->severity,
            ])
            ->all();
    }
}
