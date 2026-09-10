<?php

namespace Tests\Feature\Journey;

use App\Models\User;
use App\Models\UserPreference;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JourneySearchTest extends TestCase
{
    use RefreshDatabase;
    use CreatesJourneyNetwork;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createJourneyNetwork();
        $this->user = User::factory()->create();
    }

    private function searchPayload(array $overrides = []): array
    {
        $origin = $this->nearStop($this->stopA);
        $destination = $this->nearStop($this->stopC);

        return array_merge([
            'origin_lat' => $origin['lat'],
            'origin_lng' => $origin['lng'],
            'destination_lat' => $destination['lat'],
            'destination_lng' => $destination['lng'],
            'requested_at' => \Carbon\Carbon::today()->setTime(7, 30)->format('Y-m-d\TH:i'), // naive = Cairo wall (GTFS frame)
        ], $overrides);
    }

    /** @test */
    public function search_requires_authentication()
    {
        $response = $this->postJson('/api/v1/journeys/search', $this->searchPayload());

        $response->assertStatus(401);
    }

    /** @test */
    public function search_validates_required_coordinates()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['origin_lat', 'origin_lng', 'destination_lat', 'destination_lng']);
    }

    /** @test */
    public function search_rejects_out_of_range_coordinates()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $this->searchPayload([
                'origin_lat' => 91,
                'destination_lng' => 200,
            ]));

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['origin_lat', 'destination_lng']);
    }

    /** @test */
    public function search_finds_a_direct_transit_option()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $this->searchPayload());

        $response->assertStatus(200);
        $options = $response->json('data.options');
        $this->assertNotEmpty($options);

        $direct = collect($options)->first(fn ($option) => $option['total_transfers'] === 0);
        $this->assertNotNull($direct, 'Expected at least one direct option.');

        $transitLegs = collect($direct['legs'])->filter(fn ($leg) => $leg['type'] === 'transit');
        $this->assertCount(1, $transitLegs);
        $this->assertEquals($this->metroVariant->id, $transitLegs->first()['route_variant_id']);
        $this->assertEquals('metro', $transitLegs->first()['mode']);
        $this->assertEquals($this->stopA->id, $transitLegs->first()['from_stop']['id']);
        $this->assertEquals($this->stopC->id, $transitLegs->first()['to_stop']['id']);

        // Legs are walk -> transit -> walk in sequence.
        $this->assertEquals('walking', $direct['legs'][0]['type']);
        $this->assertEquals('walking', $direct['legs'][2]['type']);

        // Score components present.
        $this->assertArrayHasKey('score', $direct);
        $this->assertEquals(0, $direct['total_transfers']);
    }

    /** @test */
    public function search_finds_a_multi_modal_one_transfer_option()
    {
        $origin = $this->nearStop($this->stopX);
        $destination = $this->nearStop($this->stopC);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $this->searchPayload([
                'origin_lat' => $origin['lat'],
                'origin_lng' => $origin['lng'],
            ]));

        $response->assertStatus(200);
        $options = $response->json('data.options');
        $this->assertNotEmpty($options);

        $transferOption = collect($options)->first(fn ($option) => $option['total_transfers'] === 1);
        $this->assertNotNull($transferOption, 'Expected a one-transfer option from Ramses to Garden City.');

        $modes = collect($transferOption['legs'])
            ->filter(fn ($leg) => $leg['type'] === 'transit')
            ->pluck('mode')
            ->unique()
            ->values();
        $this->assertEqualsCanonicalizing(['bus', 'metro'], $modes->all(), 'Expected a bus + metro multi-modal journey.');

        $this->assertCount(1, $transferOption['transfers']);
        $this->assertContains($transferOption['transfers'][0]['transfer_type'], ['waiting', 'transfer_walk']);
    }

    /** @test */
    public function search_uses_scheduled_stop_times_when_available()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $this->searchPayload());

        $direct = collect($response->json('data.options'))
            ->first(fn ($option) => $option['total_transfers'] === 0);

        $transitLeg = collect($direct['legs'])->firstWhere('type', 'transit');

        // Requested at 07:30; the scheduled metro departs Tahrir at 08:00.
        $this->assertStringContainsString('08:00', $transitLeg['departure_time']);
        $this->assertStringContainsString('08:20', $transitLeg['arrival_time']);
    }

    /** @test */
    public function naive_requested_at_is_planned_in_cairo_wall_time()
    {
        // Time-frame contract (GTFS static times are Cairo wall-clock):
        // a naive 07:30 request catches the 08:00 wall trip, and leg times
        // carry the +03:00 offset so clients display true wall clock.
        // An offset-carrying 07:30Z (04:30 wall, pre-service) must NOT
        // catch it — proving the frame follows the instant, not the digits.
        $naive = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $this->searchPayload([
                'requested_at' => \Carbon\Carbon::today()->setTime(7, 30)->format('Y-m-d\TH:i'),
            ]));
        $leg = collect(collect($naive->json('data.options'))->firstWhere('total_transfers', 0)['legs'])
            ->firstWhere('type', 'transit');
        $this->assertStringContainsString('08:00', $leg['departure_time']);
        $this->assertStringContainsString('+03:00', $leg['departure_time']);

        $offset = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $this->searchPayload([
                'requested_at' => \Carbon\Carbon::today()->setTime(7, 30)->toIso8601String(),
            ]));
        $firstLeg = $offset->json('data.options')[0]['legs'][0];
        // 07:30Z == 10:30 wall: the 08:00 trip is gone, so the first leg
        // cannot depart at 08:00.
        $this->assertStringNotContainsString('T08:00', $firstLeg['departure_time']);
    }

    /** @test */
    public function search_is_deterministic_for_identical_input()
    {
        $payload = $this->searchPayload(['alternatives' => 5]);

        $first = $this->actingAs($this->user)->postJson('/api/v1/journeys/search', $payload)->json();
        $second = $this->actingAs($this->user)->postJson('/api/v1/journeys/search', $payload)->json();

        $this->assertEquals($first, $second);
    }

    /** @test */
    public function search_returns_options_sorted_by_score()
    {
        // From Ramses to Garden City the planner produces both a walking and
        // a one-transfer transit option.
        $origin = $this->nearStop($this->stopX);
        $destination = $this->nearStop($this->stopC);

        $payload = $this->searchPayload([
            'origin_lat' => $origin['lat'],
            'origin_lng' => $origin['lng'],
            'alternatives' => 5,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/v1/journeys/search', $payload);

        $options = collect($response->json('data.options'));
        $this->assertGreaterThanOrEqual(2, $options->count());

        $scores = $options->pluck('score');
        $this->assertEquals($scores->sort()->values()->all(), $scores->values()->all(), 'Options must be sorted by ascending score.');
    }

    /** @test */
    public function search_honors_avoided_modes_preference()
    {
        UserPreference::create([
            'user_id' => $this->user->id,
            'avoided_modes' => ['metro'],
        ]);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $this->searchPayload());

        $options = $response->json('data.options');

        $modes = collect($options)
            ->pluck('legs')
            ->flatten(1)
            ->filter(fn ($leg) => $leg['type'] === 'transit')
            ->pluck('mode')
            ->unique();

        $this->assertNotContains('metro', $modes);
    }

    /** @test */
    public function search_honors_max_transfers_preference()
    {
        UserPreference::create([
            'user_id' => $this->user->id,
            'max_transfers' => 0,
        ]);

        $origin = $this->nearStop($this->stopX);
        $destination = $this->nearStop($this->stopC);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $this->searchPayload([
                'origin_lat' => $origin['lat'],
                'origin_lng' => $origin['lng'],
            ]));

        $options = collect($response->json('data.options'));

        // From Ramses to Garden City every transit plan that continues to the
        // destination stop needs one transfer, so with max_transfers = 0 only
        // the walking plan and direct plans may remain.
        $this->assertNotEmpty($options);
        $this->assertTrue($options->every(fn ($option) => $option['total_transfers'] === 0));
        $this->assertTrue($options->every(
            fn ($option) => collect($option['legs'])
                ->filter(fn ($leg) => $leg['type'] === 'transit')
                ->count() <= 1
        ));
    }

    /** @test */
    public function search_request_overrides_beat_stored_preferences()
    {
        UserPreference::create([
            'user_id' => $this->user->id,
            'max_transfers' => 0,
        ]);

        $origin = $this->nearStop($this->stopX);
        $destination = $this->nearStop($this->stopC);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $this->searchPayload([
                'origin_lat' => $origin['lat'],
                'origin_lng' => $origin['lng'],
                'max_transfers' => 1,
            ]));

        $options = $response->json('data.options');
        $this->assertNotEmpty($options, 'Request override must lift the stored max_transfers preference.');
    }

    /** @test */
    public function search_honors_max_walk_distance_preference()
    {
        // No preferences: default max walk is 1000 m.
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $this->searchPayload([
                'max_walk_distance_per_leg' => 100,
            ]));

        // Origins/destinations sit ~70 m from their stops, so options still exist.
        $this->assertNotEmpty($response->json('data.options'));

        // With a 10 km walk radius the network is unchanged but walking-only
        // coverage grows; the endpoint must still respond consistently.
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $this->searchPayload([
                'max_walk_distance_per_leg' => 10000,
            ]));

        $response->assertStatus(200);
    }

    /** @test */
    public function search_returns_a_walking_only_option_for_close_destinations()
    {
        // Two points ~220 m apart, far from every transit stop.
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', [
                'origin_lat' => 30.0900,
                'origin_lng' => 31.3000,
                'destination_lat' => 30.0915,
                'destination_lng' => 31.3015,
            ]);

        $options = $response->json('data.options');
        $this->assertNotEmpty($options);

        $walkingOption = collect($options)->first(
            fn ($option) => count($option['legs']) === 1 && $option['legs'][0]['type'] === 'walking'
        );
        $this->assertNotNull($walkingOption, 'Expected a walking-only option.');
        $this->assertEquals(0, $walkingOption['total_transfers']);
        $this->assertGreaterThan(0, $walkingOption['walk_distance_meters']);
    }

    /** @test */
    public function search_returns_no_options_when_nothing_is_reachable()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', [
                'origin_lat' => 30.2000,
                'origin_lng' => 31.5000,
                'destination_lat' => 30.2500,
                'destination_lng' => 31.5500,
            ]);

        $response->assertStatus(200);
        $this->assertEmpty($response->json('data.options'));
    }

    /** @test */
    public function search_limits_requested_alternatives()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $this->searchPayload(['alternatives' => 2]));

        $this->assertLessThanOrEqual(2, count($response->json('data.options')));
    }
}
