<?php

namespace Tests\Feature\Journey;

use App\Models\Area;
use App\Models\Schedule;
use App\Models\Fare;
use App\Models\TransitStop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Fayoum Transport Pack — governed expansion into the ONE network.
 *
 * Honesty contract under test:
 *  - REAL: Faiyum markaz areas + approximate town-level stops exist,
 *  - DEMO-ESTIMATED: corridor/city routes + frequency schedules are labeled
 *    with source 'fayoum_pack:demo' and never presented as live,
 *  - UNKNOWN: NO fare rows are fabricated for Fayoum (absence is honest),
 *  - provenance: a data_import_logs row records the pack with fares:0,
 *  - ONE NETWORK: the planner plans Fayoum → Giza through the corridor.
 */
class FayoumPackTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The pack attaches to the Faiyum governorate from the baseline seed.
        $this->seed(\GovernorateSeeder::class);
        $this->seed(\TransitModeSeeder::class);
        $this->seed(\TransitOperatorSeeder::class);
        $this->seed(\FayoumTransportPackSeeder::class);
    }

    /** @test */
    public function pack_seeds_real_geography_demo_routes_and_provenance_without_fares()
    {
        // REAL: markaz areas under Faiyum (21).
        $this->assertGreaterThanOrEqual(8, Area::where('governorate_id', 21)->count());

        // REAL geography, DEMO pack membership: approximate stops exist.
        $stops = TransitStop::where('gtfs_stop_id', 'like', 'fayoum:%')->get();
        $this->assertGreaterThanOrEqual(7, $stops->count());
        $terminal = $stops->firstWhere('gtfs_stop_id', 'fayoum:terminal');
        $this->assertNotNull($terminal);
        $this->assertEquals('approximate', $terminal->location_accuracy);

        // Corridor anchors to the EXISTING Greater Cairo Giza stop (one network).
        $corridorRoute = \App\Models\Route::where('gtfs_route_id', 'fayoum:demo-corridor')->first();
        $this->assertNotNull($corridorRoute);
        $variant = \App\Models\RouteVariant::where('route_id', $corridorRoute->id)->first();
        $routeStopIds = \App\Models\RouteStop::where('route_variant_id', $variant->id)
            ->orderBy('sequence')
            ->pluck('transit_stop_id');
        $this->assertSame($terminal->id, (int) $routeStopIds->first());
        // The corridor terminates at a Giza stop (existing Greater Cairo stop
        // when present, otherwise the pack's own corridor-gate fallback).
        $lastStop = TransitStop::find($routeStopIds->last());
        $this->assertStringContainsString('Giza', $lastStop->name);

        // UNKNOWN: no fare rows are fabricated for the demo pack.
        $this->assertSame(0, Fare::where('source', 'fayoum_pack:demo')->count());

        // DEMO-ESTIMATED schedules honestly labeled, never live.
        $schedule = Schedule::where('gtfs_trip_id', 'like', 'fayoum:demo-trip:%')->first();
        $this->assertNotNull($schedule);
        $this->assertTrue($schedule->is_active);
        $this->assertStringContainsString('DEMO-ESTIMATED', $schedule->notes);

        // Provenance row with an explicit fares:0 count.
        $log = DB::table('data_import_logs')->where('source', 'fayoum_pack:demo')->first();
        $this->assertNotNull($log);
        $this->assertSame(0, json_decode($log->counts, true)['fares']);
    }

    /** @test */
    public function planner_routes_fayoum_to_giza_through_the_one_network()
    {
        $user = \App\Models\User::factory()->create();
        $terminal = TransitStop::where('gtfs_stop_id', 'fayoum:terminal')->first();
        $giza = TransitStop::where('name', 'like', '%Giza%')->first();

        $response = $this->actingAs($user)
            ->postJson('/api/v1/journeys/search', [
                'origin_lat' => (float) $terminal->latitude,
                'origin_lng' => (float) $terminal->longitude,
                'destination_lat' => (float) $giza->latitude,
                'destination_lng' => (float) $giza->longitude,
                'requested_at' => \Carbon\Carbon::today()->setTime(8, 0)->format('Y-m-d\TH:i'),
            ]);

        $response->assertStatus(200);
        $options = $response->json('data.options');
        $this->assertNotEmpty($options, 'Fayoum → Giza must be plannable in the ONE network.');

        // The best option actually rides the demo corridor (minibus leg).
        $bestLegs = $options[0]['legs'];
        $usesCorridor = collect($bestLegs)->contains(
            fn (array $leg) => $leg['type'] === 'transit'
                && $leg['mode'] === 'minibus'
                && ($leg['route']['short_name'] ?? null) === 'F01'
        );
        $this->assertTrue($usesCorridor, 'Best option should ride the Fayoum↔Giza corridor.');

        // Geometry integrity holds cross-governorate too (trimmed transit line).
        $transitLeg = collect($bestLegs)->firstWhere('type', 'transit');
        if (is_array($transitLeg['geometry'] ?? null) && count($transitLeg['geometry']) >= 2) {
            $head = $transitLeg['geometry'][0];
            $tail = $transitLeg['geometry'][count($transitLeg['geometry']) - 1];
            $this->assertEqualsWithDelta((float) $transitLeg['from_lat'], (float) $head[0], 0.01);
            $this->assertEqualsWithDelta((float) $transitLeg['to_lat'], (float) $tail[0], 0.01);
        }
    }
}
