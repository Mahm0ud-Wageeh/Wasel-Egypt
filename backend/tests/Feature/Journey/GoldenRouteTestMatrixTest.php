<?php

namespace Tests\Feature\Journey;

use App\Models\User;
use App\Services\Journey\JourneyPlannerService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Golden Route Test Matrix covering deterministic routing scenarios.
 * Verifies that candidate routes pass validity gates, Pareto dominance guardrails,
 * and deterministic scoring, producing explainable recommendation reasons.
 */
class GoldenRouteTestMatrixTest extends TestCase
{
    use RefreshDatabase;
    use CreatesJourneyNetwork;

    private User $user;
    private JourneyPlannerService $planner;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createJourneyNetwork();
        $this->user = User::factory()->create();
        $this->planner = app(JourneyPlannerService::class);
    }

    /**
     * 1. Cairo → Cairo short trip (within Downtown network).
     */
    public function test_cairo_short_trip_selects_direct_transit(): void
    {
        $origin = $this->nearStop($this->stopA);
        $dest = $this->nearStop($this->stopB);
        $dep = Carbon::parse('2026-09-14 07:55:00', 'Africa/Cairo');

        $result = $this->planner->search($this->user, [
            'origin_lat' => $origin['lat'],
            'origin_lng' => $origin['lng'],
            'destination_lat' => $dest['lat'],
            'destination_lng' => $dest['lng'],
            'requested_at' => $dep->toIso8601String(),
        ]);

        $this->assertNotEmpty($result['options']);
        $best = $result['options'][0];
        $this->assertTrue($best['recommended'] ?? false);
        $this->assertEquals(0, $best['total_transfers']);
        $this->assertLessThan(3600, $best['total_duration_sec']);
        $this->assertNotEmpty($best['recommendation_reasons'] ?? []);
    }

    /**
     * 2. Cairo → Giza: Metro-heavy trunk trip.
     */
    public function test_cairo_to_giza_trunk_trip(): void
    {
        $origin = $this->nearStop($this->stopA);
        $dest = $this->nearStop($this->stopC);
        $dep = Carbon::parse('2026-09-14 07:50:00', 'Africa/Cairo');

        $result = $this->planner->search($this->user, [
            'origin_lat' => $origin['lat'],
            'origin_lng' => $origin['lng'],
            'destination_lat' => $dest['lat'],
            'destination_lng' => $dest['lng'],
            'requested_at' => $dep->toIso8601String(),
        ]);

        $this->assertNotEmpty($result['options']);
        $best = $result['options'][0];
        $this->assertEquals('metro', $best['legs'][1]['mode']);
        $this->assertGreaterThanOrEqual(0.8, $best['reliability']);
        $this->assertContains('direct_service', $best['recommendation_reasons']);
    }

    /**
     * 3. Giza → Cairo: Reverse flow.
     */
    public function test_reverse_trip_feasibility(): void
    {
        $origin = $this->nearStop($this->stopB);
        $dest = $this->nearStop($this->stopC);
        $dep = Carbon::parse('2026-09-14 08:05:00', 'Africa/Cairo');

        $result = $this->planner->search($this->user, [
            'origin_lat' => $origin['lat'],
            'origin_lng' => $origin['lng'],
            'destination_lat' => $dest['lat'],
            'destination_lng' => $dest['lng'],
            'requested_at' => $dep->toIso8601String(),
        ]);

        $this->assertNotEmpty($result['options']);
        $best = $result['options'][0];
        $this->assertLessThan(2400, $best['total_duration_sec']);
    }

    /**
     * 4. Multi-transfer journey (Bus X -> Interchange B -> Metro C).
     */
    public function test_multi_transfer_journey_connects_geographically(): void
    {
        $origin = $this->nearStop($this->stopX);
        $dest = $this->nearStop($this->stopC);
        $dep = Carbon::parse('2026-09-14 08:00:00', 'Africa/Cairo');

        $result = $this->planner->search($this->user, [
            'origin_lat' => $origin['lat'],
            'origin_lng' => $origin['lng'],
            'destination_lat' => $dest['lat'],
            'destination_lng' => $dest['lng'],
            'requested_at' => $dep->toIso8601String(),
            'max_transfers' => 2,
            'max_walk_distance_per_leg' => 300,
        ]);

        $this->assertNotEmpty($result['options']);
        $best = $result['options'][0];
        $this->assertGreaterThanOrEqual(1, $best['total_transfers']);

        // Verify consecutive legs continuity
        $legs = $best['legs'];
        for ($i = 1; $i < count($legs); $i++) {
            $this->assertGreaterThanOrEqual(
                $legs[$i - 1]['arrival_time']->getTimestamp(),
                $legs[$i]['departure_time']->getTimestamp(),
                'Leg timestamps must be sequentially coherent'
            );
        }
    }

    /**
     * 5. Very short journey (< 300m) selects walking-only without transit overhead.
     */
    public function test_very_short_journey_selects_walking_only(): void
    {
        $result = $this->planner->search($this->user, [
            'origin_lat' => 30.0440,
            'origin_lng' => 31.2350,
            'destination_lat' => 30.0450,
            'destination_lng' => 31.2360,
        ]);

        $this->assertNotEmpty($result['options']);
        $best = $result['options'][0];
        $this->assertEquals(1, count($best['legs']));
        $this->assertEquals('walking', $best['legs'][0]['type']);
        $this->assertEquals(0, $best['total_transfers']);
    }

    /**
     * 6. Same origin and destination.
     */
    public function test_same_origin_and_destination(): void
    {
        $result = $this->planner->search($this->user, [
            'origin_lat' => 30.0440,
            'origin_lng' => 31.2350,
            'destination_lat' => 30.0440,
            'destination_lng' => 31.2350,
        ]);

        $this->assertNotEmpty($result['options']);
        $best = $result['options'][0];
        $this->assertEquals(0, $best['total_transfers']);
        $this->assertLessThanOrEqual(60, $best['total_duration_sec']);
    }

    /**
     * 7. No viable route for remote unserved coordinates.
     */
    public function test_no_viable_route_returns_empty_options(): void
    {
        $result = $this->planner->search($this->user, [
            'origin_lat' => 25.0000,
            'origin_lng' => 30.0000,
            'destination_lat' => 26.0000,
            'destination_lng' => 31.0000,
            'max_walk_distance_per_leg' => 500,
        ]);

        $this->assertEmpty($result['options']);
        $this->assertNull($result['best_option_index']);
    }

    /**
     * 8. Pre-service opening departure snaps to scheduled morning service.
     */
    public function test_early_morning_pre_service_departure(): void
    {
        $origin = $this->nearStop($this->stopA);
        $dest = $this->nearStop($this->stopB);
        $earlyDep = Carbon::parse('2026-09-14 05:00:00', 'Africa/Cairo');

        $result = $this->planner->search($this->user, [
            'origin_lat' => $origin['lat'],
            'origin_lng' => $origin['lng'],
            'destination_lat' => $dest['lat'],
            'destination_lng' => $dest['lng'],
            'requested_at' => $earlyDep->toIso8601String(),
        ]);

        $this->assertNotEmpty($result['options']);
        $best = $result['options'][0];
        $transitLeg = collect($best['legs'])->firstWhere('type', 'transit');
        if ($transitLeg) {
            $this->assertGreaterThanOrEqual('08:00', $transitLeg['departure_time']->format('H:i'));
        }
    }

    /**
     * 9. Late evening departure handles timetable availability honestly.
     */
    public function test_late_departure_handles_availability(): void
    {
        $origin = $this->nearStop($this->stopA);
        $dest = $this->nearStop($this->stopB);
        $lateDep = Carbon::parse('2026-09-14 23:30:00', 'Africa/Cairo');

        $result = $this->planner->search($this->user, [
            'origin_lat' => $origin['lat'],
            'origin_lng' => $origin['lng'],
            'destination_lat' => $dest['lat'],
            'destination_lng' => $dest['lng'],
            'requested_at' => $lateDep->toIso8601String(),
        ]);

        $this->assertNotEmpty($result['options']);
        $best = $result['options'][0];
        $this->assertNotNull($best['score']);
    }

    /**
     * 10. Direct route beats multi-transfer candidate.
     */
    public function test_direct_route_preferred_over_unnecessary_transfers(): void
    {
        $origin = $this->nearStop($this->stopA);
        $dest = $this->nearStop($this->stopB);
        $dep = Carbon::parse('2026-09-14 07:55:00', 'Africa/Cairo');

        $result = $this->planner->search($this->user, [
            'origin_lat' => $origin['lat'],
            'origin_lng' => $origin['lng'],
            'destination_lat' => $dest['lat'],
            'destination_lng' => $dest['lng'],
            'requested_at' => $dep->toIso8601String(),
        ]);

        $best = $result['options'][0];
        $this->assertEquals(0, $best['total_transfers']);
    }

    /**
     * 11. Pareto Dominance: strictly dominated candidates never beat superior ones.
     */
    public function test_pareto_dominance_guardrail(): void
    {
        $origin = $this->nearStop($this->stopA);
        $dest = $this->nearStop($this->stopC);
        $dep = Carbon::parse('2026-09-14 07:50:00', 'Africa/Cairo');

        $result = $this->planner->search($this->user, [
            'origin_lat' => $origin['lat'],
            'origin_lng' => $origin['lng'],
            'destination_lat' => $dest['lat'],
            'destination_lng' => $dest['lng'],
            'requested_at' => $dep->toIso8601String(),
        ]);

        $options = $result['options'];
        if (count($options) > 1) {
            $best = $options[0];
            $second = $options[1];

            $secondDominatesBest = (
                $second['total_duration_sec'] <= $best['total_duration_sec'] &&
                $second['walk_distance_meters'] <= $best['walk_distance_meters'] &&
                $second['total_transfers'] <= $best['total_transfers'] &&
                ($second['reliability'] ?? 1.0) >= ($best['reliability'] ?? 1.0) &&
                (
                    $second['total_duration_sec'] < $best['total_duration_sec'] ||
                    $second['walk_distance_meters'] < $best['walk_distance_meters'] ||
                    $second['total_transfers'] < $best['total_transfers']
                )
            );

            $this->assertFalse($secondDominatesBest, 'The chosen best option must never be Pareto-dominated by an alternative');
        }
        $this->assertTrue(true);
    }

    /**
     * 12. Recommendation explainability hierarchy exists on best route.
     */
    public function test_recommendation_explainability_hierarchy(): void
    {
        $origin = $this->nearStop($this->stopA);
        $dest = $this->nearStop($this->stopB);
        $dep = Carbon::parse('2026-09-14 07:55:00', 'Africa/Cairo');

        $result = $this->planner->search($this->user, [
            'origin_lat' => $origin['lat'],
            'origin_lng' => $origin['lng'],
            'destination_lat' => $dest['lat'],
            'destination_lng' => $dest['lng'],
            'requested_at' => $dep->toIso8601String(),
        ]);

        $best = $result['options'][0];
        $this->assertArrayHasKey('recommendation_reasons', $best);
        $this->assertIsArray($best['recommendation_reasons']);
        $this->assertNotEmpty($best['recommendation_reasons']);
    }
}
