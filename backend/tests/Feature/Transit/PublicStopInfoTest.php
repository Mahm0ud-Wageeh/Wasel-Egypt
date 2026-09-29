<?php

namespace Tests\Feature\Transit;

use App\Models\Route;
use App\Models\RouteStop;
use App\Models\RouteVariant;
use App\Models\Schedule;
use App\Models\StopTime;
use App\Models\TransitMode;
use App\Models\TransitStop;
use App\Models\TransitOperator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Public stop info endpoints (design-system v3 §10 stop panel):
 *
 * - GET /stops/{id}?with_routes=1  → stop detail + serving routes
 * - GET /stops/{id}/departures     → next real departures (timetable or
 *                                    frequency headway grid; none invented)
 * - GET /stops?lat&lng&radius      → nearby stops, nearest first, with
 *                                    distance_meters and the standard
 *                                    {data, links, meta} envelope.
 */
class PublicStopInfoTest extends TestCase
{
    use RefreshDatabase;

    private function makeServingNetwork(string $stopName, array $scheduleAttributes = [])
    {
        $mode = TransitMode::factory()->create(['name' => 'metro']);
        $operator = TransitOperator::factory()->create();
        $route = Route::factory()->create([
            'transit_mode_id' => $mode->id,
            'transit_operator_id' => $operator->id,
            'short_name' => 'M1',
            'long_name' => 'Helwan - Ain Shams',
        ]);
        $variant = RouteVariant::factory()->create([
            'route_id' => $route->id,
            'active' => true,
        ]);
        $stop = TransitStop::factory()->create([
            'name' => $stopName,
            'latitude' => 30.0444,
            'longitude' => 31.2357,
        ]);
        RouteStop::factory()->create([
            'route_variant_id' => $variant->id,
            'transit_stop_id' => $stop->id,
            'sequence' => 1,
        ]);

        return [$stop, $variant, $route];
    }

    /** @test */
    public function live_crowd_returns_honest_empty_state_without_pings()
    {
        [$stop] = $this->makeServingNetwork('Tahrir');

        $response = $this->getJson("/api/v1/stops/{$stop->id}/live");

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.stop_id', $stop->id);
        $response->assertJsonPath('data.riders_nearby', 0);
        $response->assertJsonPath('data.pings', 0);
        $this->assertNull($response->json('data.freshest_ping_seconds_ago'));
    }

    /** @test */
    public function live_crowd_counts_nearby_in_flight_pings_anonymously()
    {
        [$stop] = $this->makeServingNetwork('Tahrir');

        $user = \App\Models\User::factory()->create();
        $journey = \App\Models\Journey::factory()->create(['user_id' => $user->id]);
        $active = \App\Models\ActiveJourney::create([
            'journey_id' => $journey->id,
            'user_id' => $user->id,
            'status' => 'active',
        ]);
        \App\Models\JourneyProgress::create([
            'active_journey_id' => $active->id,
            'recorded_at' => now()->subMinutes(2),
            'latitude' => 30.0445,
            'longitude' => 31.2358,
        ]);

        $response = $this->getJson("/api/v1/stops/{$stop->id}/live");

        $response->assertStatus(200);
        $response->assertJsonPath('data.riders_nearby', 1);
        $response->assertJsonPath('data.pings', 1);
        // Privacy: no identities or coordinates leak into the payload.
        $this->assertArrayNotHasKey('journeys', $response->json('data'));
        $this->assertArrayNotHasKey('pings_detail', $response->json('data'));
    }

    /** @test */
    public function live_crowd_ignores_stale_and_finished_journeys()
    {
        [$stop] = $this->makeServingNetwork('Tahrir');

        $user = \App\Models\User::factory()->create();
        $journey = \App\Models\Journey::factory()->create(['user_id' => $user->id]);
        $stale = \App\Models\ActiveJourney::create([
            'journey_id' => $journey->id,
            'user_id' => $user->id,
            'status' => 'active',
        ]);
        \App\Models\JourneyProgress::create([
            'active_journey_id' => $stale->id,
            'recorded_at' => now()->subHours(3),
            'latitude' => 30.0445,
            'longitude' => 31.2358,
        ]);
        $done = \App\Models\ActiveJourney::create([
            'journey_id' => $journey->id,
            'user_id' => $user->id,
            'status' => 'completed',
        ]);
        \App\Models\JourneyProgress::create([
            'active_journey_id' => $done->id,
            'recorded_at' => now()->subMinute(),
            'latitude' => 30.0445,
            'longitude' => 31.2358,
        ]);

        $this->getJson("/api/v1/stops/{$stop->id}/live")
            ->assertStatus(200)
            ->assertJsonPath('data.riders_nearby', 0);
    }

    /** @test */
    public function live_crowd_for_unknown_stop_returns_404()
    {
        $this->getJson('/api/v1/stops/999999/live')->assertStatus(404);
    }

    /** @test */
    public function stop_detail_includes_serving_routes_when_requested()
    {
        [$stop] = $this->makeServingNetwork('Sadat');

        $response = $this->getJson("/api/v1/stops/{$stop->id}?with_routes=1");

        $response->assertOk();
        $response->assertJsonPath('data.serving_routes.0.route_id', fn ($v) => $v !== null);
        $serving = $response->json('data.serving_routes');
        $this->assertNotEmpty($serving);
        $this->assertSame('M1', $serving[0]['short_name']);
        $this->assertContains('metro', $serving[0]['modes']);
    }

    /** @test */
    public function stop_detail_contract_is_unchanged_without_the_flag()
    {
        [$stop] = $this->makeServingNetwork('Sadat');

        $response = $this->getJson("/api/v1/stops/{$stop->id}");

        $response->assertOk();
        // The additive field must NOT appear for existing consumers.
        $this->assertArrayNotHasKey('serving_routes', $response->json('data'));
    }

    /** @test */
    public function departures_return_frequency_grid_times_from_real_schedule()
    {
        [$stop, $variant] = $this->makeServingNetwork('Attaba');

        // Frequency service: 10-minute headway, same-day window (GTFS clock
        // semantics are per-day: a window reaching past midnight cannot be
        // expressed, and a fixed 05:00–23:00 window went flaky near 23:00
        // UTC). Robust construction: headway 120s, window = floor5(now) ..
        // 23:59 of the same clock day. At any run time at least two 2-minute
        // grid slots remain before 23:59 (worst case 23:55 → 23:56, 23:58).
        $gridStart = Carbon::now()->floorMinutes(5)->format('H:i:s');
        Schedule::create([
            'route_variant_id' => $variant->id,
            'service_id' => 'SVC1',
            'is_active' => true,
            'start_date' => Carbon::today()->toDateString(),
            'frequency_windows' => [
                ['start_time' => $gridStart, 'end_time' => '23:59:00', 'headway_secs' => 120],
            ],
        ]);
        StopTime::create([
            'schedule_id' => Schedule::first()->id,
            'transit_stop_id' => $stop->id,
            'sequence' => 1,
            'departure_time' => $gridStart,
            'arrival_time' => null,
        ]);

        $response = $this->getJson("/api/v1/stops/{$stop->id}/departures");

        $response->assertOk();
        $departures = $response->json('data.departures');
        $this->assertNotEmpty($departures);
        $this->assertTrue($departures[0]['has_timetable']);
        $times = $departures[0]['departures'];
        $this->assertNotEmpty($times);
        $this->assertSame('frequency', $times[0]['source']);

        // Times are in the future; grid positions are relative to the
        // window start, so the meaningful invariant is the headway spacing
        // between consecutive departures being exactly one headway apart.
        $first = Carbon::parse($times[0]['time']);
        $this->assertTrue($first->isFuture() || $first->equalTo(Carbon::now()));
        // Consecutive grid departures are one headway apart.
        $second = Carbon::parse($times[1]['time']);
        $this->assertEqualsWithDelta(120, $first->diffInSeconds($second), 1);
    }

    /** @test */
    public function departures_without_schedule_data_are_listed_without_invented_times()
    {
        [$stop] = $this->makeServingNetwork('No Timetable Stop');

        $response = $this->getJson("/api/v1/stops/{$stop->id}/departures");

        $response->assertOk();
        $departures = $response->json('data.departures');
        $this->assertNotEmpty($departures);
        $this->assertFalse($departures[0]['has_timetable']);
        $this->assertSame([], $departures[0]['departures']);
    }

    /** @test */
    public function departures_for_unknown_stop_return_404()
    {
        $response = $this->getJson('/api/v1/stops/999999/departures');

        $response->assertStatus(404);
        $response->assertJsonPath('success', false);
    }

    /** @test */
    public function nearby_stops_return_sorted_by_distance_with_standard_envelope()
    {
        [$stop] = $this->makeServingNetwork('Tahrir Square');
        $far = TransitStop::factory()->create([
            'name' => 'Giza Pyramids Entrance',
            'latitude' => 29.9773, // ~9 km away
            'longitude' => 31.1325,
        ]);

        $response = $this->getJson('/api/v1/stops?lat=30.0444&lng=31.2357&radius=500&per_page=10');

        $response->assertOk();
        $data = $response->json('data');
        $this->assertNotEmpty($data);
        // Standard envelope shape matches other paginated endpoints.
        $this->assertArrayHasKey('meta', $response->json());
        $this->assertArrayHasKey('total', $response->json('meta'));
        // Only in-radius stops, nearest first, with distance.
        $this->assertEquals('Tahrir Square', $data[0]['name']);
        $this->assertNotNull($data[0]['distance_meters']);
        $this->assertLessThanOrEqual(500, $data[0]['distance_meters']);
        $names = array_column($data, 'name');
        $this->assertNotContains('Giza Pyramids Entrance', $names);
        // Distances are ascending.
        $distances = array_column($data, 'distance_meters');
        $sorted = $distances;
        sort($sorted);
        $this->assertSame($sorted, $distances);
    }

    /** @test */
    public function nearby_distance_field_is_absent_for_plain_queries()
    {
        [$stop] = $this->makeServingNetwork('Tahrir Square');

        $response = $this->getJson('/api/v1/stops?search=Tahrir');

        $response->assertOk();
        $this->assertArrayNotHasKey('distance_meters', $response->json('data.0'));
    }
}
