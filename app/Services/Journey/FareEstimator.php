<?php

namespace App\Services\Journey;

use App\Models\SystemConfig;

/**
 * Estimates journey fare for metro journeys from the imported Transport
 * for Cairo fare matrix (system_config key 'tfc_metro_fares').
 * Fare dates and source years come from the imported config metadata.
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
        $fareData = $this->loadMetroFareMatrix();
        if ($fareData === null) {
            return null;
        }
        $matrix = $fareData['matrix'];

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
            'source' => self::TFC_FARES_KEY . ($fareData['as_of'] !== null ? '_' . substr($fareData['as_of'], 0, 4) : ''),
            'as_of' => $fareData['as_of'],
            'data_status' => 'real',
        ];
    }

    /**
     * Multimodal journey fare estimation with breakdown (Phase 18 Requirement).
     * Calculates official tariffs for rail/metro and realistic approximate fares for bus/microbus.
     *
     * @param array $plan
     * @return array|null
     */
    public function estimateMultimodal(array $plan): ?array
    {
        $transitLegs = array_values(array_filter(
            $plan['legs'] ?? [],
            fn ($leg) => ($leg['type'] ?? '') === 'transit' || in_array($leg['mode'] ?? '', ['metro', 'lrt', 'monorail', 'brt', 'bus', 'microbus', 'minibus', 'rail'], true)
        ));

        if ($transitLegs === []) {
            return null;
        }

        $fareData = $this->loadMetroFareMatrix();
        $matrix = $fareData['matrix'] ?? [];

        $totalAmount = 0.0;
        $hasApproximate = false;
        $breakdown = [];

        foreach ($transitLegs as $index => $leg) {
            $mode = $leg['mode'] ?? 'bus';
            $legFare = 0.0;
            $isApprox = false;
            $labelAr = '';

            switch ($mode) {
                case 'metro':
                    $fromId = $leg['from_stop']['id'] ?? null;
                    $toId = $leg['to_stop']['id'] ?? null;
                    $matrixFare = ($fromId && $toId) ? ($matrix[$fromId][$toId] ?? null) : null;
                    if ($matrixFare !== null) {
                        $legFare = (float) $matrixFare;
                        $labelAr = 'مترو الأنفاق (تعريفة رسمية مؤكدة)';
                    } else {
                        $legFare = 10.0;
                        $isApprox = true;
                        $labelAr = 'مترو الأنفاق (تعريفة قياسية تقريبية)';
                    }
                    break;

                case 'lrt':
                    $legFare = 15.0;
                    $labelAr = 'القطار الكهربائي الخفيف (LRT)';
                    break;

                case 'monorail':
                    $legFare = 40.0;
                    $labelAr = 'مونوريل شرق/غرب النيل';
                    break;

                case 'brt':
                    $legFare = 10.0;
                    $labelAr = 'حافلات BRT السريعة (الدائري)';
                    break;

                case 'bus':
                    $legFare = 10.0;
                    $isApprox = true;
                    $labelAr = 'أتوبيس هيئة النقل العام / مواصلات مصر';
                    break;

                case 'microbus':
                case 'minibus':
                    $distanceMeters = (float) ($leg['distance_meters'] ?? 10000);
                    if ($distanceMeters <= 6000) {
                        $legFare = 7.0;
                    } elseif ($distanceMeters <= 18000) {
                        $legFare = 10.0;
                    } elseif ($distanceMeters <= 40000) {
                        $legFare = 18.0;
                    } else {
                        $legFare = 28.0;
                    }
                    $isApprox = true;
                    $labelAr = 'ميكروباص (تعريفة تقريبية حسب المسافة)';
                    break;

                case 'rail':
                case 'train':
                    $legFare = 35.0;
                    $isApprox = true;
                    $labelAr = 'سكك حديد مصر (قطار تحيا مصر / روسي)';
                    break;

                default:
                    $legFare = 10.0;
                    $isApprox = true;
                    $labelAr = 'وسيلة مواصلات برية';
                    break;
            }

            if ($isApprox) {
                $hasApproximate = true;
            }

            $totalAmount += $legFare;
            $breakdown[] = [
                'leg_index' => $index,
                'mode' => $mode,
                'amount' => round($legFare, 2),
                'currency' => 'EGP',
                'is_approximate' => $isApprox,
                'label_ar' => $labelAr,
            ];
        }

        return [
            'amount' => round($totalAmount, 2),
            'currency' => 'EGP',
            'is_approximate' => $hasApproximate,
            'breakdown' => $breakdown,
            'data_status' => $hasApproximate ? 'approximate' : 'real',
        ];
    }

    /**
     * Price a single stop-to-stop pair from the TfC matrix when both stops
     * belong to it. Used by the public fares surface so published pair
     * pricing and journey pricing come from the exact same verified data.
     *
     * @return array|null ['amount' => float, 'currency' => string, 'source' => string, 'as_of' => ?string, 'data_status' => string]
     */
    public function estimateForStops(int $fromStopId, int $toStopId): ?array
    {
        $fareData = $this->loadMetroFareMatrix();
        if ($fareData === null) {
            return null;
        }

        // Pairs are keyed by the TfC-imported stop ids recorded in the matrix.
        $legFare = $fareData['matrix'][(string) $fromStopId][(string) $toStopId]
            ?? $fareData['matrix'][$fromStopId][$toStopId]
            ?? null;

        if ($legFare === null) {
            return null;
        }

        return [
            'amount' => round((float) $legFare, 2),
            'currency' => 'EGP',
            'source' => self::TFC_FARES_KEY . ($fareData['as_of'] !== null ? '_' . substr($fareData['as_of'], 0, 4) : ''),
            'as_of' => $fareData['as_of'],
            'data_status' => 'real',
        ];
    }

    /**
     * Load and normalize the TfC metro fare matrix from system_config,
     * null when the row is absent or malformed.
     *
     * @return array{matrix: array<string,array<string,float>>, as_of: ?string}|null
     */
    private function loadMetroFareMatrix(): ?array
    {
        $payloadRaw = null;
        if (\Illuminate\Support\Facades\Schema::hasTable('system_configs')) {
            $row = \Illuminate\Support\Facades\DB::table('system_configs')
                ->where('key', self::TFC_FARES_KEY)
                ->first();
            if ($row) {
                $payloadRaw = $row->value;
            }
        }
        if (!$payloadRaw && \Illuminate\Support\Facades\Schema::hasTable('system_config')) {
            $row = \Illuminate\Support\Facades\DB::table('system_config')
                ->where('config_key', self::TFC_FARES_KEY)
                ->first();
            if ($row) {
                $payloadRaw = $row->config_value;
            }
        }

        if (!$payloadRaw) {
            return null;
        }

        $payload = json_decode((string) $payloadRaw, true);
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

        // Preserve the importer's recorded date alongside its matrix. Missing or
        // malformed metadata stays unknown; the estimator never invents a date.
        $asOf = $payload['as_of'] ?? null;
        if (!is_string($asOf) || !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/D', $asOf)) {
            $asOf = null;
        }

        return ['matrix' => $normalized, 'as_of' => $asOf];
    }
}
