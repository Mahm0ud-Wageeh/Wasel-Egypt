<?php

namespace Tests\Feature\Journey;

use App\Models\Area;
use App\Models\Governorate;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\RouteVariant;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use App\Models\TransitStop;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifies the planner's board-eligible reachability strategy on a network
 * shaped like the real dense paratransit mesh: many local loops clustered at
 * the endpoint, with the cross-city journey only reachable via a trunk line
 * boarding at a stop beyond the nearest few.
 *
 * Layout (origin side, left; destination side, right):
 *
 *   O (origin)
 *   ├── five "local" stops L1..L5 each on their own tiny loop variants
 *   ├── T (trunk boarding stop, 700m from O — beyond the 5 nearest locals)
 *   │      trunk variant: T ─ I ─ D
 *   └── D (destination-side stop), I = interchange
 */
class PlannerReachabilityTest extends TestCase
{
    use RefreshDatabase;

    private TransitStop $trunkBoard;
    private TransitStop $interchange;
    private TransitStop $destNear;

    /** @test */
    public function cross_city_journey_via_trunk_stop_beyond_nearest_locals_is_found()
    {
        $this->buildMesh();

        $planner = app(\App\Services\Journey\JourneyPlannerService::class);
        $plans = $planner->plan(
            30.0000, 31.0000,          // origin point near the local cluster
            $this->destNear->latitude,
            $this->destNear->longitude,
            null,
            Carbon::today()->setTime(10, 0),
            3,
        );

        $this->assertNotSame([], $plans, 'A valid one-transfer journey exists and must be found');

        // The winning plan must use the trunk variant through the interchange.
        $best = $plans[0];
        $transitLegs = array_values(array_filter(
            $best['legs'],
            fn (array $leg) => $leg['type'] === 'transit'
        ));

        $this->assertNotEmpty($transitLegs);
        $trunkLeg = $transitLegs[0];
        $this->assertSame('Tahrir Trunk', $trunkLeg['route']['long_name']);
        $this->assertSame('Trunk Terminal', $trunkLeg['from_stop']['name']);
    }

    /** @test */
    public function pure_local_loop_network_returns_no_transit_plans()
    {
        // Same mesh minus the trunk: only local loops remain. A journey to
        // the destination must not fabricate plans.
        $this->buildMesh(withTrunk: false);

        $planner = app(\App\Services\Journey\JourneyPlannerService::class);
        $plans = $planner->plan(
            30.0000, 31.0000,
            $this->destNear->latitude,
            $this->destNear->longitude,
            null,
            Carbon::today()->setTime(10, 0),
            3,
        );

        $transitPlans = array_filter(
            $plans,
            fn (array $plan) => collect($plan['legs'])->contains(fn ($leg) => $leg['type'] === 'transit')
        );

        $this->assertSame([], $transitPlans, 'No fabricate-able transit plan should exist without a connecting service');
    }

    private function buildMesh(bool $withTrunk = true): void
    {
        $governorate = Governorate::create(['name' => 'Mesh Cairo', 'code' => 'MCA']);
        $area = Area::create(['governorate_id' => $governorate->id, 'name' => 'Mesh Area']);

        $busMode = TransitMode::create(['name' => 'bus', 'description' => 'Bus', 'icon' => 'bus']);
        $operator = TransitOperator::create(['name' => 'Mesh Operator']);

        // Local loop stops near the origin (~30-100m away).
        $locals = [];
        foreach ([
            ['Local One', 30.0003, 31.0003],
            ['Local Two', 30.0004, 31.0002],
            ['Local Three', 30.0002, 31.0004],
            ['Local Four', 30.0005, 31.0005],
            ['Local Five', 30.0006, 31.0001],
        ] as [$name, $lat, $lng]) {
            $locals[] = TransitStop::create([
                'gtfs_stop_id' => 'mesh-' . $name,
                'name' => $name,
                'latitude' => $lat,
                'longitude' => $lng,
                'area_id' => $area->id,
            ]);
        }

        // Each local gets its own tiny loop (A→B→A on two nearby stops),
        // so the nearest-stop candidate list is fully occupied by locals.
        foreach ($locals as $index => $local) {
            $other = TransitStop::create([
                'gtfs_stop_id' => 'mesh-far-' . $index,
                'name' => 'Far End ' . $index,
                'latitude' => 30.1000 + $index * 0.01,
                'longitude' => 31.1000,
                'area_id' => $area->id,
            ]);

            $route = Route::create([
                'transit_mode_id' => $busMode->id,
                'transit_operator_id' => $operator->id,
                'gtfs_route_id' => 'mesh-local-' . $index,
                'long_name' => 'Local Loop ' . $index,
                'type' => 3,
            ]);
            $variant = RouteVariant::create([
                'route_id' => $route->id,
                'name' => 'Loop ' . $index,
                'direction' => 'loop',
            ]);

            foreach ([$local, $other] as $seq => $stop) {
                RouteStop::create([
                    'route_variant_id' => $variant->id,
                    'transit_stop_id' => $stop->id,
                    'sequence' => $seq + 1,
                ]);
            }
        }

        // Destination-side stop (~8km away).
        $this->destNear = TransitStop::create([
            'gtfs_stop_id' => 'mesh-dest',
            'name' => 'Pyramid Gate',
            'latitude' => 29.9300,
            'longitude' => 31.0800,
            'area_id' => $area->id,
        ]);

        if ($withTrunk) {
            // Trunk boarding stop ~700m north of the origin — beyond the five
            // nearest locals.
            $this->trunkBoard = TransitStop::create([
                'gtfs_stop_id' => 'mesh-trunk-t',
                'name' => 'Trunk Terminal',
                'latitude' => 30.0063,
                'longitude' => 31.0000,
                'area_id' => $area->id,
            ]);
            $this->interchange = TransitStop::create([
                'gtfs_stop_id' => 'mesh-trunk-i',
                'name' => 'Giza Interchange',
                'latitude' => 29.9600,
                'longitude' => 31.0700,
                'area_id' => $area->id,
            ]);

            // Trunk variant: T → I → dest-side.
            $trunkRoute = Route::create([
                'transit_mode_id' => $busMode->id,
                'transit_operator_id' => $operator->id,
                'gtfs_route_id' => 'mesh-trunk',
                'long_name' => 'Tahrir Trunk',
                'type' => 3,
            ]);
            $trunkVariant = RouteVariant::create([
                'route_id' => $trunkRoute->id,
                'name' => 'Trunk Out',
                'direction' => 'outbound',
                'headsign' => 'Giza',
            ]);
            foreach ([$this->trunkBoard, $this->interchange, $this->destNear] as $seq => $stop) {
                RouteStop::create([
                    'route_variant_id' => $trunkVariant->id,
                    'transit_stop_id' => $stop->id,
                    'sequence' => $seq + 1,
                ]);
            }
        }
    }
}
