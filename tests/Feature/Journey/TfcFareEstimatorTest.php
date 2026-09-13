<?php

namespace Tests\Feature\Journey;

use App\Services\Journey\FareEstimator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * TfC metro fare matrix integration (Phase TFC1).
 *
 * Covers the honesty contract of FareEstimator against the imported
 * 'tfc_metro_fares_2018' system_config row:
 *  - pure-metro plans with a known stop pair get the real TfC fare,
 *  - plans containing any non-metro transit leg return null (no partial
 *    totals — bus/paratransit fares do not exist in any TfC source),
 *  - unknown metro stations (outside the 61-station matrix) return null,
 *  - absence of the config row keeps the pre-TFC neutral behavior.
 */
class TfcFareEstimatorTest extends TestCase
{
    use RefreshDatabase;

    private function makePlan(array $legs): array
    {
        return [
            'legs' => $legs,
            'transfers' => [],
            'total_duration_sec' => 1200,
            'total_transfers' => 0,
            'walk_distance_meters' => 200,
            'reliability' => 1.0,
        ];
    }

    private function metroLeg(int $fromId, int $toId): array
    {
        return [
            'type' => 'transit',
            'mode' => 'metro',
            'from_stop' => ['id' => $fromId, 'lat' => 30.0, 'lng' => 31.2],
            'to_stop' => ['id' => $toId, 'lat' => 30.05, 'lng' => 31.25],
            'distance_meters' => 5000,
        ];
    }

    private function seedMatrix(array $matrix, array $metadata = []): void
    {
        DB::table('system_config')->updateOrInsert(
            ['config_key' => FareEstimator::TFC_FARES_KEY],
            [
                'config_value' => json_encode([
                    'source' => 'test fixture',
                    'currency' => 'EGP',
                    'matrix' => $matrix,
                    ...$metadata,
                ]),
                'config_type' => 'json',
                'description' => 'test',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    /** @test */
    public function pure_metro_plan_gets_the_real_tfc_fare()
    {
        $this->seedMatrix(['11' => ['22' => 5.0]]);

        $fare = (new FareEstimator())->estimate(
            $this->makePlan([
                ['type' => 'walking', 'mode' => 'walking', 'distance_meters' => 100],
                $this->metroLeg(11, 22),
                ['type' => 'walking', 'mode' => 'walking', 'distance_meters' => 100],
            ])
        );

        $this->assertNotNull($fare);
        $this->assertSame(5.0, $fare['amount']);
        $this->assertSame('EGP', $fare['currency']);
        $this->assertSame('tfc_metro_fares', $fare['source']);
    }

    public function test_fare_metadata_comes_from_the_stored_import_date(): void
    {
        foreach (['2024-10', '2018-06', '2025-01'] as $asOf) {
            $this->seedMatrix(['11' => ['22' => 8.0]], ['as_of' => $asOf]);
            $fare = (new FareEstimator())->estimate($this->makePlan([$this->metroLeg(11, 22)]));
            $this->assertSame([
                'amount' => 8.0,
                'currency' => 'EGP',
                'source' => 'tfc_metro_fares_' . substr($asOf, 0, 4),
                'as_of' => $asOf,
                'data_status' => 'real',
            ], $fare);
        }
    }

    public function test_missing_or_invalid_metadata_never_invents_a_date(): void
    {
        foreach ([[], ['as_of' => null], ['as_of' => '2024-13'], ['as_of' => 'invalid']] as $metadata) {
            $this->seedMatrix(['11' => ['22' => 8.0]], $metadata);
            $fare = (new FareEstimator())->estimate($this->makePlan([$this->metroLeg(11, 22)]));
            $this->assertSame(8.0, $fare['amount']);
            $this->assertSame('tfc_metro_fares', $fare['source']);
            $this->assertNull($fare['as_of']);
        }
    }

    public function test_dated_matrix_does_not_attach_fares_or_metadata_to_ground_plans(): void
    {
        $this->seedMatrix(['11' => ['22' => 8.0]], ['as_of' => '2024-10']);
        foreach (['bus', 'minibus', 'microbus', 'rail'] as $mode) {
            $ground = [...$this->metroLeg(11, 22), 'mode' => $mode];
            $this->assertNull((new FareEstimator())->estimate($this->makePlan([$ground])));
            $this->assertNull((new FareEstimator())->estimate($this->makePlan([$this->metroLeg(11, 22), $ground])));
        }
    }

    /** @test */
    public function plan_with_a_bus_leg_returns_null_not_a_partial_total()
    {
        $this->seedMatrix(['11' => ['22' => 5.0]]);

        $legs = [
            $this->metroLeg(11, 22),
            [
                'type' => 'transit',
                'mode' => 'bus',
                'from_stop' => ['id' => 33, 'lat' => 30.0, 'lng' => 31.2],
                'to_stop' => ['id' => 44, 'lat' => 30.05, 'lng' => 31.25],
                'distance_meters' => 3000,
            ],
        ];

        $this->assertNull((new FareEstimator())->estimate($this->makePlan($legs)));
    }

    /** @test */
    public function metro_stop_pair_outside_the_matrix_returns_null()
    {
        $this->seedMatrix(['11' => ['22' => 5.0]]);

        $this->assertNull(
            (new FareEstimator())->estimate($this->makePlan([$this->metroLeg(11, 99)]))
        );
    }

    /** @test */
    public function without_the_config_row_fares_stay_neutral()
    {
        DB::table('system_config')->where('config_key', FareEstimator::TFC_FARES_KEY)->delete();

        $this->assertNull(
            (new FareEstimator())->estimate($this->makePlan([$this->metroLeg(11, 22)]))
        );
    }

    /** @test */
    public function walking_only_plan_returns_null()
    {
        $this->seedMatrix(['11' => ['22' => 5.0]]);

        $this->assertNull((new FareEstimator())->estimate(
            $this->makePlan([['type' => 'walking', 'mode' => 'walking', 'distance_meters' => 500]])
        ));
    }

    /** @test */
    public function multi_leg_metro_journey_sums_each_boarding()
    {
        $this->seedMatrix([
            '11' => ['22' => 3.0],
            '22' => ['33' => 5.0],
        ]);

        $fare = (new FareEstimator())->estimate($this->makePlan([
            $this->metroLeg(11, 22),
            $this->metroLeg(22, 33),
        ]));

        $this->assertNotNull($fare);
        $this->assertSame(8.0, $fare['amount']);
    }
}
