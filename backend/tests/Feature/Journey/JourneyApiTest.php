<?php

namespace Tests\Feature\Journey;

use App\Models\Journey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JourneyApiTest extends TestCase
{
    use RefreshDatabase;
    use CreatesJourneyNetwork;

    private User $user;
    private User $otherUser;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createJourneyNetwork();
        $this->user = User::factory()->create();
        $this->otherUser = User::factory()->create();
        $this->admin = User::factory()->create();
        $this->admin->roles()->create(['name' => 'admin', 'description' => 'Administrator']);
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
    public function user_can_save_a_journey_from_a_search()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys', $this->searchPayload());

        $response->assertStatus(201);
        $response->assertJsonPath('success', true);

        $journey = $response->json('data');
        $this->assertEquals($this->user->id, $journey['user_id']);
        $this->assertEquals('planned', $journey['status']);
        $this->assertGreaterThan(0, $journey['total_duration_sec']);

        // Direct plan: walk -> transit -> walk.
        $this->assertCount(3, $journey['legs']);
        $this->assertEquals('walking', $journey['legs'][0]['mode']);
        $this->assertEquals('metro', $journey['legs'][1]['mode']);
        $this->assertEquals(1, $journey['legs'][0]['sequence']);
        $this->assertEquals(2, $journey['legs'][1]['sequence']);
        $this->assertEquals(3, $journey['legs'][2]['sequence']);

        $this->assertDatabaseHas('journeys', [
            'user_id' => $this->user->id,
            'status' => 'planned',
        ]);
        $this->assertDatabaseCount('journey_legs', 3);
    }

    /** @test */
    public function saving_a_one_transfer_journey_persists_the_transfer()
    {
        $origin = $this->nearStop($this->stopX);
        $destination = $this->nearStop($this->stopC);

        // Find a one-transfer option, then save exactly that option.
        $search = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys/search', $this->searchPayload([
                'origin_lat' => $origin['lat'],
                'origin_lng' => $origin['lng'],
            ]));

        $transferIndex = collect($search->json('data.options'))
            ->search(fn ($option) => $option['total_transfers'] === 1);
        $this->assertNotFalse($transferIndex, 'Fixture must produce a one-transfer option.');

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys', $this->searchPayload([
                'origin_lat' => $origin['lat'],
                'origin_lng' => $origin['lng'],
                'option_index' => $transferIndex,
            ]));

        $response->assertStatus(201);
        $journey = $response->json('data');

        $this->assertEquals(1, $journey['total_transfers']);
        $this->assertNotEmpty($journey['transfers']);
        $this->assertContains($journey['transfers'][0]['transfer_type'], ['waiting', 'transfer_walk']);
        $this->assertDatabaseCount('transfers', 1);
    }

    /** @test */
    public function store_validates_input()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/journeys', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['origin_lat', 'origin_lng', 'destination_lat', 'destination_lng']);
    }

    /** @test */
    public function store_rejects_an_out_of_range_option_index()
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys', $this->searchPayload(['option_index' => 4]));

        $response->assertStatus(422);
    }

    /** @test */
    public function user_can_view_their_journey_details_with_legs_and_transfers()
    {
        $journeyId = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys', $this->searchPayload())
            ->json('data.id');

        $response = $this->actingAs($this->user)->getJson("/api/v1/journeys/{$journeyId}");

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(3, $data['legs']);
        $this->assertArrayHasKey('transfers', $data);
        $this->assertArrayHasKey('route_variant', $data['legs'][1]);
        $this->assertEquals('Tahrir - Garden City Metro', $data['legs'][1]['route']['long_name'] ?? null);
    }

    /** @test */
    public function another_user_cannot_view_a_journey()
    {
        $journeyId = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys', $this->searchPayload())
            ->json('data.id');

        $response = $this->actingAs($this->otherUser)->getJson("/api/v1/journeys/{$journeyId}");

        $response->assertStatus(403);
    }

    /** @test */
    public function admin_can_view_any_journey()
    {
        $journeyId = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys', $this->searchPayload())
            ->json('data.id');

        $response = $this->actingAs($this->admin)->getJson("/api/v1/journeys/{$journeyId}");

        $response->assertStatus(200);
    }

    /** @test */
    public function index_lists_only_the_users_journeys()
    {
        $this->actingAs($this->user)->postJson('/api/v1/journeys', $this->searchPayload());

        $mine = $this->actingAs($this->user)->getJson('/api/v1/journeys');
        $theirs = $this->actingAs($this->otherUser)->getJson('/api/v1/journeys');

        $mine->assertStatus(200);
        $this->assertCount(1, $mine->json('data'));
        $this->assertEquals($this->user->id, $mine->json('data.0.user_id'));

        $theirs->assertStatus(200);
        $this->assertCount(0, $theirs->json('data'));
    }

    /** @test */
    public function admin_can_filter_journeys_by_user_id()
    {
        $this->actingAs($this->user)->postJson('/api/v1/journeys', $this->searchPayload());

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/journeys?user_id={$this->user->id}");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }

    /** @test */
    public function user_can_delete_their_journey()
    {
        $journeyId = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys', $this->searchPayload())
            ->json('data.id');

        $delete = $this->actingAs($this->user)->deleteJson("/api/v1/journeys/{$journeyId}");
        $delete->assertStatus(200);

        $this->actingAs($this->user)->getJson("/api/v1/journeys/{$journeyId}")->assertStatus(404);
    }

    /** @test */
    public function another_user_cannot_delete_a_journey()
    {
        $journeyId = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys', $this->searchPayload())
            ->json('data.id');

        $this->actingAs($this->otherUser)->deleteJson("/api/v1/journeys/{$journeyId}")->assertStatus(403);

        $this->assertDatabaseHas('journeys', ['id' => $journeyId, 'deleted_at' => null]);
    }

    /** @test */
    public function alternatives_endpoint_replans_options_for_a_saved_journey()
    {
        $journeyId = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys', $this->searchPayload())
            ->json('data.id');

        $response = $this->actingAs($this->user)->getJson("/api/v1/journeys/{$journeyId}/alternatives");

        $response->assertStatus(200);
        $options = $response->json('data.options');
        $this->assertNotEmpty($options);

        // The saved journey used the best direct option, so one alternative
        // must match it.
        $this->assertTrue(
            collect($options)->contains(fn ($option) => $option['matches_saved'] === true),
            'Expected at least one alternative to match the saved journey.'
        );

        // All options are scored and sorted.
        $scores = collect($options)->pluck('score');
        $this->assertEquals($scores->sort()->values()->all(), $scores->values()->all());
    }

    /** @test */
    public function journey_details_show_scheduled_times_from_stop_times()
    {
        $journeyId = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys', $this->searchPayload())
            ->json('data.id');

        $data = $this->actingAs($this->user)->getJson("/api/v1/journeys/{$journeyId}")->json('data');
        $transitLeg = $data['legs'][1];

        $this->assertStringContainsString('08:00', $transitLeg['departure_time']);
        $this->assertStringContainsString('08:20', $transitLeg['arrival_time']);
    }

    /** @test */
    public function journeys_require_authentication()
    {
        $this->postJson('/api/v1/journeys', $this->searchPayload())->assertStatus(401);
        $this->getJson('/api/v1/journeys')->assertStatus(401);
        // Search itself is deliberately public (guests can plan).
        $this->postJson('/api/v1/journeys/search', $this->searchPayload())->assertStatus(200);
        $this->getJson('/api/v1/journeys/1')->assertStatus(401);
        $this->getJson('/api/v1/journeys/1/alternatives')->assertStatus(401);
        $this->deleteJson('/api/v1/journeys/1')->assertStatus(401);
    }

    /** @test */
    public function journey_status_is_planned_on_creation()
    {
        $journeyId = $this->actingAs($this->user)
            ->postJson('/api/v1/journeys', $this->searchPayload())
            ->json('data.id');

        $this->assertDatabaseHas('journeys', ['id' => $journeyId, 'status' => 'planned']);
    }
}
