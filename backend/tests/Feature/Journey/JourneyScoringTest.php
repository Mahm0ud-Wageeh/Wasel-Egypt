<?php

namespace Tests\Feature\Journey;

use App\Services\Journey\JourneyScoringService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JourneyScoringTest extends TestCase
{
    use RefreshDatabase;

    private function makePlan(array $overrides = []): array
    {
        return array_merge([
            'legs' => [
                ['type' => 'walking', 'mode' => 'walking', 'distance_meters' => 100],
                ['type' => 'transit', 'mode' => 'metro', 'distance_meters' => 5000],
                ['type' => 'walking', 'mode' => 'walking', 'distance_meters' => 100],
            ],
            'transfers' => [],
            'total_duration_sec' => 1200,
            'total_transfers' => 0,
            'walk_distance_meters' => 200,
            'reliability' => 1.0,
        ], $overrides);
    }

    /** @test */
    public function faster_plans_score_better_than_slower_ones()
    {
        $service = new JourneyScoringService();

        $fast = $this->makePlan(['total_duration_sec' => 1200]);
        $slow = $this->makePlan(['total_duration_sec' => 3600]);

        $scored = $service->score([$slow, $fast]);

        $this->assertEquals(1200, $scored[0]['total_duration_sec']);
        $this->assertLessThan($scored[1]['score'], $scored[0]['score']);
    }

    /** @test */
    public function more_transfers_score_worse()
    {
        $service = new JourneyScoringService();

        $direct = $this->makePlan();
        $transfer = $this->makePlan([
            'total_duration_sec' => 1200,
            'total_transfers' => 1,
            'legs' => [
                ['type' => 'walking', 'mode' => 'walking', 'distance_meters' => 100],
                ['type' => 'transit', 'mode' => 'bus', 'distance_meters' => 2500],
                ['type' => 'transit', 'mode' => 'metro', 'distance_meters' => 2500],
                ['type' => 'walking', 'mode' => 'walking', 'distance_meters' => 100],
            ],
        ]);

        $scored = $service->score([$transfer, $direct]);

        $this->assertLessThan($scored[1]['score'], $scored[0]['score']);
        $this->assertEquals(0, $scored[0]['total_transfers']);
    }

    /** @test */
    public function reliability_affects_the_score()
    {
        $service = new JourneyScoringService();

        $reliable = $this->makePlan(['reliability' => 1.0]);
        $unreliable = $this->makePlan(['reliability' => 0.3]);

        $scored = $service->score([$unreliable, $reliable]);

        $this->assertLessThan($scored[1]['score'], $scored[0]['score']);
        $this->assertEquals(1.0, $scored[0]['reliability']);
    }

    /** @test */
    public function preferred_modes_receive_a_bonus()
    {
        $service = new JourneyScoringService();

        $plans = [
            $this->makePlan(['total_duration_sec' => 1200, 'reliability' => 0.8]),
            $this->makePlan(['total_duration_sec' => 1500, 'reliability' => 1.0, 'legs' => [
                ['type' => 'walking', 'mode' => 'walking', 'distance_meters' => 100],
                ['type' => 'transit', 'mode' => 'bus', 'distance_meters' => 5000],
                ['type' => 'walking', 'mode' => 'walking', 'distance_meters' => 100],
            ]]),
        ];

        $plain = $service->score($plans);
        $preferred = $service->score($plans, (object) ['preferred_modes' => ['metro'], 'avoided_modes' => []]);

        $plainMetroScore = collect($plain)->first(fn ($p) => $p['total_duration_sec'] === 1200)['score'];
        $preferredMetroScore = collect($preferred)->first(fn ($p) => $p['total_duration_sec'] === 1200)['score'];

        $this->assertLessThan($plainMetroScore, $preferredMetroScore);
    }

    /** @test */
    public function avoided_modes_receive_a_penalty()
    {
        $service = new JourneyScoringService();

        $busPlan = $this->makePlan([
            'total_duration_sec' => 1200,
            'reliability' => 0.8,
            'legs' => [
                ['type' => 'walking', 'mode' => 'walking', 'distance_meters' => 100],
                ['type' => 'transit', 'mode' => 'bus', 'distance_meters' => 5000],
                ['type' => 'walking', 'mode' => 'walking', 'distance_meters' => 100],
            ],
        ]);
        $metroPlan = $this->makePlan(['total_duration_sec' => 1500]);

        $plain = $service->score([$busPlan, $metroPlan]);
        $penalized = $service->score([$busPlan, $metroPlan], (object) ['preferred_modes' => [], 'avoided_modes' => ['bus']]);

        $plainBusScore = collect($plain)->first(fn ($p) => $p['total_duration_sec'] === 1200)['score'];
        $penalizedBusScore = collect($penalized)->first(fn ($p) => $p['total_duration_sec'] === 1200)['score'];

        $this->assertGreaterThan($plainBusScore, $penalizedBusScore);
    }

    /** @test */
    public function fare_is_included_when_available_and_neutral_when_not()
    {
        $service = new JourneyScoringService();

        $cheap = $this->makePlan(['fare' => ['amount' => 2.0, 'currency' => 'EGP']]);
        $expensive = $this->makePlan(['fare' => ['amount' => 20.0, 'currency' => 'EGP']]);

        $scored = $service->score([$expensive, $cheap]);
        $this->assertLessThan($scored[1]['score'], $scored[0]['score']);
        $this->assertEquals(2.0, $scored[0]['fare']['amount']);

        // Without fare data the weight is redistributed to time, no error.
        $noFare = $service->score([$this->makePlan()]);
        $this->assertNotNull($noFare[0]['score']);
    }

    /** @test */
    public function scoring_is_deterministic()
    {
        $service = new JourneyScoringService();

        $plans = [
            $this->makePlan(['total_duration_sec' => 1800]),
            $this->makePlan(['total_duration_sec' => 900, 'reliability' => 0.5]),
            $this->makePlan(['total_transfers' => 2, 'total_duration_sec' => 2400]),
        ];

        $first = $service->score($plans);
        $second = $service->score($plans);

        $this->assertEquals(
            array_column($first, 'score'),
            array_column($second, 'score')
        );
        $this->assertEquals(
            array_column($first, 'total_duration_sec'),
            array_column($second, 'total_duration_sec')
        );
    }

    /** @test */
    public function scores_stay_within_the_database_column_range()
    {
        $service = new JourneyScoringService();

        $scored = $service->score([
            $this->makePlan(['total_duration_sec' => 50000, 'walk_distance_meters' => 10000, 'total_transfers' => 5, 'reliability' => 0.0]),
        ]);

        $this->assertGreaterThanOrEqual(0, $scored[0]['score']);
        $this->assertLessThan(10, $scored[0]['score']);
    }
}
