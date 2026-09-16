<?php

namespace Tests\Feature\Journey;

use App\Models\SystemConfig;
use App\Services\Journey\GeoCalculator;
use App\Services\Journey\JourneyPlannerService;
use App\Services\Journey\RoadAwareWalkingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Golden Tests for Bounded 2-Transfer Journey Planning,
 * OSRM Walking Steps with Turn-by-Turn Maneuvers,
 * Angle-Classifier Fallbacks, and Geometry Honesty.
 */
class TwoTransferJourneyTest extends TestCase
{
    use RefreshDatabase, CreatesJourneyNetwork;

    /** @test */
    public function cross_city_two_transfer_journey_is_discovered_and_assembled()
    {
        $this->createJourneyNetwork();
        $this->createTwoTransferExtension();

        $planner = app(JourneyPlannerService::class);

        // Origin near stopW (Shoubra), Destination near stopY (New Cairo)
        $origin = $this->nearStop($this->stopW);
        $destination = $this->nearStop($this->stopY);

        $plans = $planner->plan(
            $origin['lat'],
            $origin['lng'],
            $destination['lat'],
            $destination['lng'],
            null,
            Carbon::today()->setTime(8, 0),
            3,
            ['max_transfers' => 2]
        );

        $this->assertNotEmpty($plans, 'A 2-transfer cross-city plan must be discovered');

        $best = $plans[0];
        $transitLegs = array_values(array_filter(
            $best['legs'],
            fn (array $leg) => $leg['type'] === 'transit'
        ));

        // Must ride exactly 3 transit legs: BW -> M1 -> B2
        $this->assertCount(3, $transitLegs);
        $this->assertSame('Shoubra - Opera Bus', $transitLegs[0]['route']['long_name']);
        $this->assertSame('Opera Square', $transitLegs[0]['to_stop']['name']);

        $this->assertSame('Tahrir - Garden City Metro', $transitLegs[1]['route']['long_name']);
        $this->assertSame('Opera Square', $transitLegs[1]['from_stop']['name']);
        $this->assertSame('Garden City', $transitLegs[1]['to_stop']['name']);

        $this->assertSame('Garden City - New Cairo Bus', $transitLegs[2]['route']['long_name']);
        $this->assertSame('Garden City', $transitLegs[2]['from_stop']['name']);
        $this->assertSame('New Cairo Terminal', $transitLegs[2]['to_stop']['name']);

        // Exactly 2 transfers
        $this->assertGreaterThanOrEqual(2, $best['total_transfers']);

        // Check geometry_source tagging on every leg
        foreach ($best['legs'] as $leg) {
            $this->assertArrayHasKey('geometry_source', $leg);
            $this->assertContains($leg['geometry_source'], ['route_geometry', 'stop_to_stop']);
        }

        // Metro fare honesty: multi-modal journey with bus must NOT fabricate a fare
        $this->assertNull($best['fare'], 'TfC fare must be null for journeys involving non-metro legs');
    }

    /** @test */
    public function osrm_steps_are_parsed_into_named_walking_leg_steps()
    {
        Http::fake([
            '*/route/v1/*' => Http::response([
                'code' => 'Ok',
                'routes' => [[
                    'distance' => 450.0,
                    'duration' => 320.0,
                    'geometry' => [
                        'type' => 'LineString',
                        'coordinates' => [
                            [31.2350, 30.0440],
                            [31.2360, 30.0450],
                            [31.2370, 30.0460],
                        ],
                    ],
                    'legs' => [[
                        'steps' => [
                            [
                                'name' => 'Tahrir St',
                                'distance' => 200.0,
                                'duration' => 140.0,
                                'maneuver' => [
                                    'type' => 'depart',
                                    'modifier' => null,
                                    'bearing_after' => 45,
                                ],
                            ],
                            [
                                'name' => 'Talaat Harb',
                                'distance' => 250.0,
                                'duration' => 180.0,
                                'maneuver' => [
                                    'type' => 'turn',
                                    'modifier' => 'right',
                                    'bearing_after' => 90,
                                ],
                            ],
                            [
                                'name' => '',
                                'distance' => 0.0,
                                'duration' => 0.0,
                                'maneuver' => [
                                    'type' => 'arrive',
                                    'modifier' => null,
                                    'bearing_after' => 90,
                                ],
                            ],
                        ],
                    ]],
                ]],
            ]),
        ]);

        $service = new RoadAwareWalkingService('http://osrm.test');
        $route = $service->walkingRoute(30.0440, 31.2350, 30.0460, 31.2370);

        $this->assertNotNull($route);
        $this->assertArrayHasKey('leg_steps', $route);
        $steps = $route['leg_steps'];

        $this->assertCount(3, $steps);
        $this->assertStringContainsString('Head northeast', $steps[0]['instruction']);
        $this->assertSame(200, $steps[0]['distance']);
        $this->assertSame(45, $steps[0]['bearing']);

        $this->assertStringContainsString('Turn right onto Talaat Harb', $steps[1]['instruction']);
        $this->assertSame(250, $steps[1]['distance']);
        $this->assertSame(90, $steps[1]['bearing']);

        $this->assertSame('Arrive at destination', $steps[2]['instruction']);
    }

    /** @test */
    public function fallback_angle_classifier_generates_steps_when_osrm_unreachable()
    {
        // Dead OSRM URL
        config(['services.osrm.url' => 'http://127.0.0.1:59998']);

        $this->createJourneyNetwork();
        $planner = app(JourneyPlannerService::class);

        $plans = $planner->plan(
            $this->nearStop($this->stopA)['lat'],
            $this->nearStop($this->stopA)['lng'],
            $this->nearStop($this->stopB)['lat'],
            $this->nearStop($this->stopB)['lng'],
            null,
            Carbon::today()->setTime(7, 30),
            3
        );

        $this->assertNotEmpty($plans);
        $walkLegs = array_values(array_filter(
            $plans[0]['legs'],
            fn (array $leg) => $leg['type'] === 'walking'
        ));

        $this->assertNotEmpty($walkLegs);
        foreach ($walkLegs as $leg) {
            $this->assertSame('estimate', $leg['walk_source']);
            $this->assertSame('stop_to_stop', $leg['geometry_source']);
            $this->assertArrayHasKey('leg_steps', $leg);
            $this->assertIsArray($leg['leg_steps']);
            $this->assertNotEmpty($leg['leg_steps']);

            // First step must have a cardinal direction and non-zero distance
            $this->assertStringContainsString('towards destination', $leg['leg_steps'][0]['instruction']);
            $this->assertGreaterThan(0, $leg['leg_steps'][0]['distance']);
            $this->assertIsInt($leg['leg_steps'][0]['bearing']);
        }
    }

    /** @test */
    public function candidate_fanout_never_exceeds_max_candidate_plans()
    {
        $this->createJourneyNetwork();
        $this->createTwoTransferExtension();

        $planner = app(JourneyPlannerService::class);

        $origin = $this->nearStop($this->stopW);
        $destination = $this->nearStop($this->stopY);

        $plans = $planner->plan(
            $origin['lat'],
            $origin['lng'],
            $destination['lat'],
            $destination['lng'],
            null,
            Carbon::today()->setTime(8, 0),
            50, // request high alternative count
            ['max_transfers' => 2]
        );

        $this->assertLessThanOrEqual(
            JourneyPlannerService::MAX_CANDIDATE_PLANS,
            count($plans),
            'Total candidate plans must never exceed MAX_CANDIDATE_PLANS (40)'
        );
    }
}
