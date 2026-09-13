<?php

namespace Tests\Feature\Transit;

use App\Models\Fare;
use App\Models\Route;
use App\Models\ServiceAlert;
use App\Models\TransitMode;
use App\Models\TransitStop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class NetworkStatsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::forget('network.stats');
    }

    public function test_stats_returns_verified_database_metrics(): void
    {
        $metro = TransitMode::factory()->create(['name' => 'metro', 'icon' => 'subway']);
        $bus = TransitMode::factory()->create(['name' => 'bus', 'icon' => 'bus']);

        TransitStop::factory()->count(3)->create();
        Route::factory()->count(2)->create(['transit_mode_id' => $metro->id, 'active' => true]);
        Route::factory()->create(['transit_mode_id' => $bus->id, 'active' => false]); // inactive → excluded

        ServiceAlert::factory()->create([
            'active_period_start' => now()->subDay(),
            'active_period_end' => now()->addDay(),
        ]);
        ServiceAlert::factory()->create([
            'active_period_start' => now()->subWeek(),
            'active_period_end' => now()->subDay(), // expired → excluded
        ]);

        Fare::create([
            'transit_mode_id' => $metro->id, 'label' => 'real tier', 'amount' => 8,
            'data_status' => 'real', 'status' => 'active',
        ]);
        Fare::create([
            'transit_mode_id' => $bus->id, 'label' => 'demo fare', 'amount' => 5,
            'data_status' => 'demo_estimated', 'status' => 'active',
        ]);

        $this->getJson('/api/v1/network/stats')
            ->assertOk()
            ->assertJsonPath('data.stops', 3)
            ->assertJsonPath('data.routes', 2)
            ->assertJsonPath('data.metro_lines', 2)
            ->assertJsonPath('data.active_alerts', 1)
            ->assertJsonPath('data.fares.real_rows', 1)
            ->assertJsonPath('data.fares.demo_estimated_rows', 1)
            ->assertJsonPath('data.modes.0.name', 'metro');

        $modes = collect($this->getJson('/api/v1/network/stats')->json('data.modes'));
        $this->assertEquals(2, $modes->firstWhere('name', 'metro')['routes']);
        // bus has 0 active routes → not listed
        $this->assertNull($modes->firstWhere('name', 'bus'));
    }

    public function test_stats_shape_is_stable_for_empty_database(): void
    {
        $response = $this->getJson('/api/v1/network/stats');

        $response->assertOk();
        $data = $response->json('data');
        foreach (['stops', 'routes', 'route_variants', 'mode_count', 'operators', 'metro_lines', 'schedules', 'governorates', 'areas', 'active_alerts', 'public_reports', 'fares'] as $key) {
            $this->assertArrayHasKey($key, $data);
        }
    }
}
