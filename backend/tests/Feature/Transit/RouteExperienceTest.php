<?php

namespace Tests\Feature\Transit;

use App\Models\Route;
use App\Models\RouteGeometry;
use App\Models\RouteStop;
use App\Models\RouteVariant;
use App\Models\Schedule;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use App\Models\TransitStop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Route/line experience (final-product completion):
 *
 * - GET /public-routes/{id}      → route + active variants with direction,
 *                                 headsign, geometry availability and REAL
 *                                 frequency windows
 * - GET /route-variants/{id}/geometry → stored polyline only (404 when the
 *                                 variant has no shape — never a fake line)
 * - GET /routes/{id}/stops       → ordered stops + variant headsign/direction
 */
class RouteExperienceTest extends TestCase
{
    use RefreshDatabase;

    private function makeLine(): array
    {
        $mode = TransitMode::factory()->create(['name' => 'metro']);
        $operator = TransitOperator::factory()->create();
        $route = Route::factory()->create([
            'transit_mode_id' => $mode->id,
            'transit_operator_id' => $operator->id,
            'short_name' => 'Line 1',
            'long_name' => 'New Marg - Helwan Metro',
        ]);
        $outbound = RouteVariant::factory()->create([
            'route_id' => $route->id,
            'active' => true,
            'headsign' => 'Helwan Metro',
            'direction' => 'outbound',
        ]);
        $inactive = RouteVariant::factory()->create([
            'route_id' => $route->id,
            'active' => false,
            'headsign' => 'Old Shuttle',
            'direction' => 'inbound',
            'name' => 'Legacy',
        ]);

        $a = TransitStop::factory()->create(['name' => 'Terminal A']);
        $b = TransitStop::factory()->create(['name' => 'Terminal B']);
        RouteStop::factory()->create(['route_variant_id' => $outbound->id, 'transit_stop_id' => $a->id, 'sequence' => 1]);
        RouteStop::factory()->create(['route_variant_id' => $outbound->id, 'transit_stop_id' => $b->id, 'sequence' => 2]);

        RouteGeometry::create([
            'route_variant_id' => $outbound->id,
            'geometry' => [[30.1, 31.2], [30.15, 31.25], [30.2, 31.3]],
            'length_meters' => 12000.5,
        ]);

        Schedule::create([
            'route_variant_id' => $outbound->id,
            'service_id' => 'SVC',
            'is_active' => true,
            'start_date' => now()->toDateString(),
            'frequency_windows' => [
                ['start_time' => '05:30:00', 'end_time' => '23:00:00', 'headway_secs' => 420],
            ],
        ]);

        return [$route, $outbound, $inactive];
    }

    /** @test */
    public function route_detail_includes_active_variants_with_direction_headsign_and_frequency()
    {
        [$route, $outbound] = $this->makeLine();

        $response = $this->getJson("/api/v1/public-routes/{$route->id}");

        $response->assertOk();
        $data = $response->json('data');
        $this->assertSame('Line 1', $data['short_name']);
        $this->assertNotNull($data['transit_operator']['name']);
        $this->assertNotNull($data['transit_mode']['name']);

        $variants = $data['variants'];
        // Only the ACTIVE variant is exposed to passengers.
        $this->assertCount(1, $variants);
        $this->assertSame($outbound->id, $variants[0]['id']);
        $this->assertSame('Helwan Metro', $variants[0]['headsign']);
        $this->assertSame('outbound', $variants[0]['direction']);
        $this->assertTrue($variants[0]['has_geometry']);
        $this->assertNotEmpty($variants[0]['frequency_windows']);
        $this->assertSame(420, $variants[0]['frequency_windows'][0]['headway_secs']);
    }

    /** @test */
    public function variant_geometry_returns_the_stored_polyline()
    {
        [, $outbound] = $this->makeLine();

        $response = $this->getJson("/api/v1/route-variants/{$outbound->id}/geometry");

        $response->assertOk();
        $data = $response->json('data');
        $this->assertSame(3, $data['points']);
        // length_meters is an integer column (existing schema) — 12000.5 stores as 12000.
        $this->assertSame(12000, $data['length_meters']);
        $this->assertCount(3, $data['geometry']);
        $this->assertSame([30.1, 31.2], $data['geometry'][0]);
    }

    /** @test */
    public function variant_geometry_is_404_without_a_stored_shape()
    {
        // Active variant, no geometry row — the honest refusal, no fake line.
        $mode = TransitMode::factory()->create(['name' => 'bus']);
        $route = Route::factory()->create(['transit_mode_id' => $mode->id]);
        $variant = RouteVariant::factory()->create(['route_id' => $route->id, 'active' => true]);

        $response = $this->getJson("/api/v1/route-variants/{$variant->id}/geometry");

        $response->assertStatus(404);
        $response->assertJsonPath('success', false);
    }

    /** @test */
    public function route_stops_include_variant_headsign_and_direction()
    {
        [$route, $outbound] = $this->makeLine();

        $response = $this->getJson("/api/v1/routes/{$route->id}/stops");

        $response->assertOk();
        $variants = $response->json('data');
        $this->assertSame('Helwan Metro', $variants[0]['headsign']);
        $this->assertSame('outbound', $variants[0]['direction']);
        $stops = $variants[0]['stops'];
        $this->assertSame('Terminal A', $stops[0]['stop_name']);
        $this->assertSame(1, $stops[0]['stop_sequence']);
        $this->assertSame('Terminal B', $stops[1]['stop_name']);
        $this->assertSame(2, $stops[1]['stop_sequence']);
    }

    /** @test */
    public function public_schedules_expose_frequency_windows()
    {
        [, $outbound] = $this->makeLine();

        $response = $this->getJson("/api/v1/public-schedules?route_variant_id={$outbound->id}");

        $response->assertOk();
        $schedule = $response->json('data.0');
        $this->assertNotNull($schedule);
        $this->assertArrayHasKey('frequency_windows', $schedule);
        $this->assertSame('05:30:00', $schedule['frequency_windows'][0]['start_time']);
    }
}
