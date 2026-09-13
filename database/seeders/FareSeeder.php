<?php

namespace Database\Seeders;

use App\Models\Fare;
use App\Models\SystemConfig;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * Seeds the published fares table from two sources, each honestly labeled:
 *
 *  REAL — the four TfC Cairo Metro tiers derived from the imported
 *  mdb-3354 fare matrix (system_config key 'tfc_metro_fares', Oct 2024).
 *  Amounts are read from the matrix itself; if the import is missing no
 *  "real" row is fabricated.
 *
 *  DEMO/ESTIMATED — flat base fares for modes where no reliable public
 *  fare source exists (bus, minibus, microbus). These are clearly marked
 *  demo_estimated and are meant to be replaced or edited by
 *  administrators without code changes.
 */
class FareSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->seedRealMetroTiers();
        $this->seedEstimatedModeFares();
    }

    private function seedRealMetroTiers(): void
    {
        $metro = TransitMode::where('name', 'metro')->first();

        if ($metro === null) {
            return;
        }

        $row = SystemConfig::where('config_key', 'tfc_metro_fares')->first();
        $payload = $row !== null ? json_decode((string) $row->config_value, true) : null;
        $matrix = is_array($payload['matrix'] ?? null) ? $payload['matrix'] : null;

        if ($matrix === null) {
            return; // No real source → no real rows. Never fabricate.
        }

        $amounts = [];
        foreach ($matrix as $destinations) {
            if (! is_array($destinations)) {
                continue;
            }
            foreach ($destinations as $amount) {
                if (is_numeric($amount)) {
                    $amounts[number_format((float) $amount, 2, '.', '')] = true;
                }
            }
        }
        $amounts = array_map('floatval', array_keys($amounts));
        sort($amounts);

        $asOf = is_string($payload['as_of'] ?? null) ? $payload['as_of'] : null;
        $effectiveFrom = $asOf !== null ? $asOf.'-01' : null;
        $operator = TransitOperator::where('name', 'National Authority for Tunnels')->first();

        $tierNames = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5', 'Tier 6'];

        foreach ($amounts as $index => $amount) {
            $tier = $tierNames[$index] ?? 'Tier '.($index + 1);

            Fare::updateOrCreate(
                [
                    'transit_mode_id' => $metro->id,
                    'tier' => $tier,
                    'source' => 'tfc_metro_fares',
                ],
                [
                    'label' => "Cairo Metro — {$tier}",
                    'transit_operator_id' => $operator?->id,
                    'amount' => $amount,
                    'currency' => 'EGP',
                    'effective_from' => $effectiveFrom,
                    'source' => 'tfc_metro_fares',
                    'confidence' => 'verified',
                    'data_status' => 'real',
                    'status' => 'active',
                    'notes' => 'Official TfC zone tier derived from the imported fare matrix'
                        .($asOf !== null ? " (feed {$asOf})" : '')
                        .'. Pair pricing is served exactly from the same matrix.',
                ],
            );
        }
    }

    private function seedEstimatedModeFares(): void
    {
        $estimated = [
            'bus' => ['amount' => 5.00, 'label' => 'CTA bus — base fare (estimated)'],
            'minibus' => ['amount' => 5.00, 'label' => 'Minibus — base fare (estimated)'],
            'microbus' => ['amount' => 6.00, 'label' => 'Microbus — base fare (estimated)'],
        ];

        foreach ($estimated as $modeName => $spec) {
            $mode = TransitMode::where('name', $modeName)->first();

            if ($mode === null) {
                continue;
            }

            Fare::updateOrCreate(
                [
                    'transit_mode_id' => $mode->id,
                    'source' => 'demo_seed',
                    'card_type' => null,
                ],
                [
                    'label' => $spec['label'],
                    'amount' => $spec['amount'],
                    'currency' => 'EGP',
                    'source' => 'demo_seed',
                    'confidence' => 'estimated',
                    'data_status' => 'demo_estimated',
                    'status' => 'active',
                    'notes' => 'Demo / Estimated — editable by administrators. No authoritative public fare source exists for this mode yet; journeys priced with it are labeled accordingly in the UI.',
                ],
            );
        }
    }
}
