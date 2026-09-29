<?php

namespace Tests\Feature\Journey;

use App\Services\Journey\GeoCalculator;
use App\Services\Journey\JourneyPlannerService;
use App\Services\Journey\RoadAwareWalkingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Road-aware walking: OSRM integration contract and the mandatory
 * straight-line fallback behavior when the routing engine is unreachable.
 */
class RoadAwareWalkingTest extends TestCase
{
    use RefreshDatabase, CreatesJourneyNetwork;

    /** @test */
    public function osrm_route_provides_distance_duration_and_geometry()
    {
        Http::fake([
            '*/route/v1/*' => Http::response([
                'code' => 'Ok',
                'routes' => [[
                    'distance' => 493.4,
                    'duration' => 359.2,
                    'geometry' => [
                        'type' => 'LineString',
                        'coordinates' => [
                            [31.2357, 30.0444],
                            [31.2330, 30.0435],
                            [31.2315, 30.0423],
                        ],
                    ],
                ]],
            ]),
        ]);

        $service = new RoadAwareWalkingService('http://osrm.test');
        $route = $service->walkingRoute(30.0444, 31.2357, 30.0423, 31.2315);

        $this->assertNotNull($route);
        $this->assertSame('osrm', $route['source']);
        $this->assertSame(493, $route['distance_meters']);
        $this->assertSame(359, $route['duration_sec']);
        // geojson [lng,lat] must be converted to [lat,lng]
        $this->assertSame([30.0444, 31.2357], $route['geometry'][0]);
        $this->assertSame([30.0423, 31.2315], $route['geometry'][2]);
    }

    /** @test */
    public function unreachable_osrm_returns_null_and_planner_falls_back_to_estimates()
    {
        // Point at a dead port: the service must return null (not throw).
        $service = new RoadAwareWalkingService('http://127.0.0.1:59999');
        $this->assertNull($service->walkingRoute(30.0444, 31.2357, 30.0423, 31.2315));

        // And the planner still plans, with estimate-sourced walking legs.
        $this->createJourneyNetwork();
        config(['services.osrm.url' => 'http://127.0.0.1:59999']);

        $planner = app(JourneyPlannerService::class);
        $plans = $planner->plan(
            $this->nearStop($this->stopA)['lat'],
            $this->nearStop($this->stopA)['lng'],
            $this->nearStop($this->stopC)['lat'],
            $this->nearStop($this->stopC)['lng'],
            null,
            Carbon::today()->setTime(7, 0),
            3,
        );

        $this->assertNotSame([], $plans, 'Search must survive an OSRM outage');

        $walkLegs = array_values(array_filter(
            $plans[0]['legs'],
            fn (array $leg) => $leg['type'] === 'walking'
        ));

        $this->assertNotEmpty($walkLegs);
        foreach ($walkLegs as $leg) {
            $this->assertSame('estimate', $leg['walk_source']);
            $this->assertNull($leg['geometry']);
            // Fallback distance carries the documented circuity allowance.
            $straight = GeoCalculator::distanceMeters(
                $leg['from_lat'], $leg['from_lng'], $leg['to_lat'], $leg['to_lng']
            );
            $this->assertGreaterThanOrEqual($straight, $leg['distance_meters']);
            $this->assertLessThanOrEqual($straight * 1.31, $leg['distance_meters']);
        }
    }

    /** @test */
    public function osrm_results_are_cached_per_coordinate_pair()
    {
        $calls = 0;
        Http::fake(function () use (&$calls) {
            $calls++;

            return Http::response([
                'code' => 'Ok',
                'routes' => [[
                    'distance' => 100.0,
                    'duration' => 72.0,
                    'geometry' => ['type' => 'LineString', 'coordinates' => [[31.0, 30.0], [31.001, 30.001]]],
                ]],
            ]);
        });

        $service = new RoadAwareWalkingService('http://osrm.test');

        $first = $service->walkingRoute(30.0444, 31.2357, 30.05, 31.24);
        $second = $service->walkingRoute(30.0444, 31.2357, 30.05, 31.24);

        $this->assertSame(1, $calls, 'Second identical request must hit the cache');
        $this->assertSame($first, $second);
    }

    /** @test */
    public function trivially_short_walks_skip_osrm()
    {
        $service = new RoadAwareWalkingService('http://127.0.0.1:59999');
        // 1 meter: no road route needed.
        $this->assertNull($service->walkingRoute(30.04440, 31.23570, 30.04441, 31.23571));
    }
}
