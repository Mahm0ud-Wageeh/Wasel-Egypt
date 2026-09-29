<?php

namespace Tests\Feature\Journey;

use App\Models\ActiveJourney;
use App\Models\Journey;
use App\Models\JourneyProgress;
use App\Models\TransitStop;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JourneyExecutionTest extends TestCase
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

    /**
     * Create and save a direct journey for the user (Tahrir -> Garden City,
     * walk -> metro -> walk), returning its id.
     */
    private function createSavedJourney(?User $user = null): int
    {
        $origin = $this->nearStop($this->stopA);
        $destination = $this->nearStop($this->stopC);

        $response = $this->actingAs($user ?? $this->user)
            ->postJson('/api/v1/journeys', [
                'origin_lat' => $origin['lat'],
                'origin_lng' => $origin['lng'],
                'destination_lat' => $destination['lat'],
                'destination_lng' => $destination['lng'],
                'requested_at' => Carbon::today()->setTime(7, 30)->toIso8601String(),
            ]);

        $response->assertStatus(201);

        return $response->json('data.id');
    }

    private function startJourney(int $journeyId, ?User $user = null, array $body = [])
    {
        return $this->actingAs($user ?? $this->user)
            ->postJson("/api/v1/journeys/{$journeyId}/start", $body);
    }

    private function sendLocation(int $activeJourneyId, ?User $user = null, array $body = [])
    {
        return $this->actingAs($user ?? $this->user)
            ->postJson("/api/v1/active-journeys/{$activeJourneyId}/location", $body);
    }

    /**
     * A valid location payload (empty latitude/longitude fail validation
     * before the state guard runs).
     */
    private function validLocationBody(): array
    {
        return [
            'latitude' => (float) $this->stopA->latitude,
            'longitude' => (float) $this->stopA->longitude,
        ];
    }

    /** @test */
    public function user_can_start_a_saved_journey()
    {
        $journeyId = $this->createSavedJourney();

        $response = $this->startJourney($journeyId, body: [
            'started_at' => Carbon::today()->setTime(7, 30)->toIso8601String(),
        ]);

        $response->assertStatus(201);
        $data = $response->json('data');

        $this->assertEquals('active', $data['status']);
        $this->assertEquals(0, $data['current_leg_index']);
        $this->assertNotNull($data['started_at']);
        $this->assertNull($data['ended_at']);
        $this->assertEquals($this->user->id, $data['user_id']);
        $this->assertEquals($journeyId, $data['journey_id']);

        // Tracking state is attached from the start.
        $this->assertEquals(0, $data['tracking']['current_leg_index']);
        $this->assertEquals(0, $data['tracking']['progress_percent']);
        $this->assertNotNull($data['tracking']['next_stop']);

        $this->assertDatabaseHas('active_journeys', [
            'journey_id' => $journeyId,
            'user_id' => $this->user->id,
            'status' => 'active',
        ]);
    }

    /** @test */
    public function start_requires_authentication()
    {
        $journeyId = $this->createSavedJourney();
        $this->app['auth']->forgetGuards();

        $this->postJson("/api/v1/journeys/{$journeyId}/start", [])->assertStatus(401);
    }

    /** @test */
    public function only_the_owner_can_start_a_journey()
    {
        $journeyId = $this->createSavedJourney();

        $this->startJourney($journeyId, $this->otherUser)->assertStatus(403);
    }

    /** @test */
    public function starting_a_second_journey_while_one_is_active_conflicts()
    {
        $firstId = $this->createSavedJourney();
        $secondId = $this->createSavedJourney();

        $this->startJourney($firstId)->assertStatus(201);
        $this->startJourney($secondId)->assertStatus(409);

        // After cancelling, the user can start another journey.
        $active = ActiveJourney::where('journey_id', $firstId)->first();
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$active->id}/cancel");

        $this->startJourney($secondId)->assertStatus(201);
    }

    /** @test */
    public function an_archived_journey_cannot_be_started()
    {
        $journeyId = $this->createSavedJourney();
        Journey::where('id', $journeyId)->update(['status' => 'archived']);

        $this->startJourney($journeyId)->assertStatus(409);
    }

    /** @test */
    public function location_update_records_progress_and_nearest_stop()
    {
        $journeyId = $this->createSavedJourney();
        $activeId = $this->startJourney($journeyId)->json('data.id');

        // Location ~30 m from Tahrir Square (the first boarding stop).
        $response = $this->sendLocation($activeId, body: [
            'latitude' => (float) $this->stopA->latitude + 0.0002,
            'longitude' => (float) $this->stopA->longitude + 0.0002,
            'recorded_at' => Carbon::today()->setTime(7, 31)->toIso8601String(),
            'speed_kph' => 4.5,
            'accuracy_meters' => 10,
        ]);

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals($this->stopA->id, $data['tracking']['nearest_stop']['id']);
        $this->assertTrue($data['tracking']['is_stop_event']);
        $this->assertLessThan(100, $data['tracking']['nearest_stop']['distance_meters']);
        $this->assertNotNull($data['progress']['id']);

        $this->assertDatabaseHas('journey_progress', [
            'active_journey_id' => $activeId,
            'nearest_stop_id' => $this->stopA->id,
            'is_stop_event' => true,
        ]);
    }

    /** @test */
    public function location_far_from_all_stops_is_not_a_stop_event()
    {
        $journeyId = $this->createSavedJourney();
        $activeId = $this->startJourney($journeyId)->json('data.id');

        // Midpoint between A and C: several hundred meters from every stop.
        $response = $this->sendLocation($activeId, body: [
            'latitude' => 30.0530,
            'longitude' => 31.2430,
        ]);

        $tracking = $response->json('data.tracking');
        $this->assertFalse($tracking['is_stop_event']);
        $this->assertNotNull($tracking['nearest_stop']);
        $this->assertGreaterThan(50, $tracking['nearest_stop']['distance_meters']);
    }

    /** @test */
    public function location_near_destination_advances_the_current_leg()
    {
        $journeyId = $this->createSavedJourney();
        $activeId = $this->startJourney($journeyId)->json('data.id');

        // At the destination stop (to_stop of the transit leg, index 1).
        $response = $this->sendLocation($activeId, body: [
            'latitude' => (float) $this->stopC->latitude,
            'longitude' => (float) $this->stopC->longitude,
        ]);

        $tracking = $response->json('data.tracking');
        $this->assertEquals(1, $tracking['current_leg_index']);
        $this->assertEquals('metro', $tracking['current_leg']['mode']);
    }

    /** @test */
    public function current_leg_index_never_regresses()
    {
        $journeyId = $this->createSavedJourney();
        $activeId = $this->startJourney($journeyId)->json('data.id');

        $this->sendLocation($activeId, body: [
            'latitude' => (float) $this->stopC->latitude,
            'longitude' => (float) $this->stopC->longitude,
        ]);
        // Back near the origin stop.
        $response = $this->sendLocation($activeId, body: [
            'latitude' => (float) $this->stopA->latitude,
            'longitude' => (float) $this->stopA->longitude,
        ]);

        $this->assertEquals(1, $response->json('data.tracking.current_leg_index'));
    }

    /** @test */
    public function progress_percent_is_time_based_and_deterministic()
    {
        $journeyId = $this->createSavedJourney();
        $totalDuration = Journey::find($journeyId)->total_duration_sec;
        $activeId = $this->startJourney($journeyId, body: [
            'started_at' => Carbon::today()->setTime(7, 30)->toIso8601String(),
        ])->json('data.id');

        $response = $this->sendLocation($activeId, body: [
            'latitude' => (float) $this->stopA->latitude + 0.0002,
            'longitude' => (float) $this->stopA->longitude + 0.0002,
            'recorded_at' => Carbon::today()->setTime(8, 0)->toIso8601String(),
        ]);

        $expected = round(min(100.0, (1800 / $totalDuration) * 100), 2);
        $this->assertEquals($expected, $response->json('data.tracking.progress_percent'));
        $this->assertEquals($expected, (float) $response->json('data.current_progress_percent'));
    }

    /** @test */
    public function progress_percent_is_capped_at_100()
    {
        $journeyId = $this->createSavedJourney();
        $activeId = $this->startJourney($journeyId, body: [
            'started_at' => Carbon::today()->setTime(7, 30)->toIso8601String(),
        ])->json('data.id');

        $response = $this->sendLocation($activeId, body: [
            'latitude' => (float) $this->stopA->latitude,
            'longitude' => (float) $this->stopA->longitude,
            'recorded_at' => Carbon::today()->setTime(23, 0)->toIso8601String(),
        ]);

        $this->assertEquals(100.0, $response->json('data.tracking.progress_percent'));
    }

    /** @test */
    public function next_stop_tracks_the_journey_position()
    {
        $journeyId = $this->createSavedJourney();
        $activeId = $this->startJourney($journeyId)->json('data.id');

        // While walking to the boarding stop, the next stop is the boarding stop.
        $show = $this->actingAs($this->user)->getJson("/api/v1/active-journeys/{$activeId}");
        $this->assertEquals($this->stopA->id, $show->json('data.tracking.next_stop.id'));

        // After reaching the alighting stop, the next stop is behind us (null:
        // only the egress walk remains ahead of the current transit leg).
        $this->sendLocation($activeId, body: [
            'latitude' => (float) $this->stopC->latitude,
            'longitude' => (float) $this->stopC->longitude,
        ]);

        $show = $this->actingAs($this->user)->getJson("/api/v1/active-journeys/{$activeId}");
        $this->assertEquals($this->stopC->id, $show->json('data.tracking.next_stop.id'));
    }

    /** @test */
    public function user_can_complete_an_active_journey()
    {
        $journeyId = $this->createSavedJourney();
        $activeId = $this->startJourney($journeyId)->json('data.id');

        $response = $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/complete");

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertEquals('completed', $data['status']);
        $this->assertNotNull($data['ended_at']);
        $this->assertEquals(100, (float) $data['current_progress_percent']);

        // Terminal state: further mutations are rejected.
        $this->sendLocation($activeId, body: $this->validLocationBody())->assertStatus(409);
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/complete")->assertStatus(409);
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/cancel")->assertStatus(409);
    }

    /** @test */
    public function user_can_cancel_an_active_journey()
    {
        $journeyId = $this->createSavedJourney();
        $activeId = $this->startJourney($journeyId)->json('data.id');

        $response = $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/cancel");

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertEquals('cancelled', $data['status']);
        $this->assertNotNull($data['ended_at']);
        $this->assertLessThan(100, (float) $data['current_progress_percent']);

        $this->sendLocation($activeId, body: $this->validLocationBody())->assertStatus(409);
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/cancel")->assertStatus(409);
    }

    /** @test */
    public function only_the_owner_can_update_track_or_finish_the_journey()
    {
        $journeyId = $this->createSavedJourney();
        $activeId = $this->startJourney($journeyId)->json('data.id');

        $this->sendLocation($activeId, $this->otherUser, $this->validLocationBody())->assertStatus(403);
        $this->sendLocation($activeId, $this->admin, $this->validLocationBody())->assertStatus(403);

        $this->actingAs($this->otherUser)->postJson("/api/v1/active-journeys/{$activeId}/complete")->assertStatus(403);
        $this->actingAs($this->admin)->postJson("/api/v1/active-journeys/{$activeId}/complete")->assertStatus(403);
        $this->actingAs($this->otherUser)->postJson("/api/v1/active-journeys/{$activeId}/cancel")->assertStatus(403);

        // The journey is untouched.
        $this->assertDatabaseHas('active_journeys', ['id' => $activeId, 'status' => 'active']);
    }

    /** @test */
    public function owner_and_admin_can_view_but_others_cannot()
    {
        $journeyId = $this->createSavedJourney();
        $activeId = $this->startJourney($journeyId)->json('data.id');

        $this->actingAs($this->user)->getJson("/api/v1/active-journeys/{$activeId}")->assertStatus(200);
        $this->actingAs($this->admin)->getJson("/api/v1/active-journeys/{$activeId}")->assertStatus(200);
        $this->actingAs($this->otherUser)->getJson("/api/v1/active-journeys/{$activeId}")->assertStatus(403);

        $this->app['auth']->forgetGuards();
        $this->getJson("/api/v1/active-journeys/{$activeId}")->assertStatus(401);

        $this->actingAs($this->otherUser)->getJson("/api/v1/active-journeys/{$activeId}/progress")->assertStatus(403);
        $this->actingAs($this->admin)->getJson("/api/v1/active-journeys/{$activeId}/progress")->assertStatus(200);
    }

    /** @test */
    public function index_lists_only_the_users_active_journeys()
    {
        $journeyId = $this->createSavedJourney();
        $this->startJourney($journeyId)->json('data.id');

        $mine = $this->actingAs($this->user)->getJson('/api/v1/active-journeys');
        $mine->assertStatus(200);
        $this->assertCount(1, $mine->json('data'));
        $this->assertEquals($this->user->id, $mine->json('data.0.user_id'));

        $theirs = $this->actingAs($this->otherUser)->getJson('/api/v1/active-journeys');
        $theirs->assertStatus(200);
        $this->assertCount(0, $theirs->json('data'));
    }

    /** @test */
    public function location_update_validates_input()
    {
        $journeyId = $this->createSavedJourney();
        $activeId = $this->startJourney($journeyId)->json('data.id');

        $this->sendLocation($activeId, body: [])->assertStatus(422);
        $this->sendLocation($activeId, body: [
            'latitude' => 91,
            'longitude' => 0,
        ])->assertStatus(422);
        $this->sendLocation($activeId, body: [
            'latitude' => 0,
            'longitude' => 0,
            'speed_kph' => 500,
        ])->assertStatus(422);
    }

    /** @test */
    public function progress_history_returns_recorded_updates_newest_first()
    {
        $journeyId = $this->createSavedJourney();
        $activeId = $this->startJourney($journeyId)->json('data.id');

        $this->sendLocation($activeId, body: [
            'latitude' => (float) $this->stopA->latitude,
            'longitude' => (float) $this->stopA->longitude,
            'recorded_at' => Carbon::today()->setTime(7, 35)->toIso8601String(),
        ]);
        $this->sendLocation($activeId, body: [
            'latitude' => (float) $this->stopC->latitude,
            'longitude' => (float) $this->stopC->longitude,
            'recorded_at' => Carbon::today()->setTime(7, 50)->toIso8601String(),
        ]);

        $response = $this->actingAs($this->user)->getJson("/api/v1/active-journeys/{$activeId}/progress");
        $response->assertStatus(200);

        $history = $response->json('progress_history');
        $this->assertCount(2, $history);
        $this->assertGreaterThanOrEqual(
            strtotime($history[1]['recorded_at']),
            strtotime($history[0]['recorded_at'])
        );

        $tracking = $response->json('data.tracking');
        $this->assertEquals(1, $tracking['current_leg_index']);
    }

    /** @test */
    public function tracking_is_deterministic_for_identical_locations()
    {
        $journeyId = $this->createSavedJourney();
        $activeId = $this->startJourney($journeyId)->json('data.id');

        $body = [
            'latitude' => (float) $this->stopB->latitude,
            'longitude' => (float) $this->stopB->longitude,
            'recorded_at' => Carbon::today()->setTime(8, 0)->toIso8601String(),
        ];

        $first = $this->sendLocation($activeId, body: $body)->json('data.tracking');
        $second = $this->sendLocation($activeId, body: $body)->json('data.tracking');

        unset($first['progress_percent'], $second['progress_percent']);

        $this->assertEquals($first, $second);
    }
}
