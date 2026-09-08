<?php

namespace App\Services\Journey;

use App\Models\SystemConfig;

/**
 * Estimates journey fare for metro journeys from the imported Transport
 * for Cairo fare matrix (system_config key 'tfc_metro_fares_2018',
 * historical June-2018 zonal fares: 3/5/7 EGP).
 *
 * Honesty contract: a fare is ONLY emitted when every transit leg of the
 * plan is a metro leg AND both boarding and alighting stops exist in the
 * TfC matrix. Any journey involving bus/minibus/microbus/rail returns
 * null — no bus fares exist in any TfC source and none are invented;
 * a partial total would silently understate the real cost.
 * When no fare can be produced the estimator returns null and the scoring
 * service treats fare as neutral (existing behavior).
 */
class FareEstimator
{
    public const CONFIG_KEY = 'journey_fare_config';

    public const TFC_FARES_KEY = 'tfc_metro_fares';

    /**
     * Estimate the fare for a planned journey.
     *
     * @param array $plan Plan structure produced by JourneyPlannerService.
     * @return array|null ['amount' => float, 'currency' => string] or null when unavailable.
     */
    public function estimate(array $plan): ?array
    {
        $matrix = $this->loadMetroFareMatrix();
        if ($matrix === null) {
            return null;
        }

        $transitLegs = array_values(array_filter(
            $plan['legs'] ?? [],
            fn ($leg) => ($leg['type'] ?? '') === 'transit'
        ));

        if ($transitLegs === []) {
            return null;
        }

        // Metro-only contract: any non-metro transit leg disqualifies the total.
        foreach ($transitLegs as $leg) {
            if (($leg['mode'] ?? '') !== 'metro') {
                return null;
            }
        }

        // Sum the matrix fare for each metro leg (usually one; transfers
        // between lines would price each boarding honestly).
        $amount = 0.0;
        foreach ($transitLegs as $leg) {
            $fromId = $leg['from_stop']['id'] ?? null;
            $toId = $leg['to_stop']['id'] ?? null;
            if ($fromId === null || $toId === null) {
                return null;
            }
            $legFare = $matrix[$fromId][$toId] ?? null;
            if ($legFare === null) {
                return null; // station pair outside the TfC matrix → no honest fare
            }
            $amount += (float) $legFare;
        }

        return [
            'amount' => round($amount, 2),
            'currency' => 'EGP',
            'source' => 'tfc_metro_fares',
        ];
    }

    /**
     * Load and normalize the TfC metro fare matrix from system_config,
     * null when the row is absent or malformed.
     *
     * @return array<string,array<string,float>>|null
     */
    private function loadMetroFareMatrix(): ?array
    {
        $row = SystemConfig::where('config_key', self::TFC_FARES_KEY)->first();

        if (!$row) {
            return null;
        }

        $payload = json_decode((string) $row->config_value, true);
        $matrix = $payload['matrix'] ?? null;

        if (!is_array($matrix)) {
            return null;
        }

        // Key normalization: JSON object keys are strings.
        $normalized = [];
        foreach ($matrix as $fromId => $destinations) {
            if (!is_array($destinations)) {
                continue;
            }
            foreach ($destinations as $toId => $amount) {
                $normalized[(string) $fromId][(string) $toId] = (float) $amount;
            }
        }

        return $normalized;
    }
}
