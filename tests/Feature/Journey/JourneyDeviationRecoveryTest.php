<?php

namespace Tests\Feature\Journey;

use App\Models\ActiveJourney;
use App\Models\DeviationEvent;
use App\Models\Journey;
use App\Models\RecoveryRoute;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JourneyDeviationRecoveryTest extends TestCase
{
    // Time convention: all scenario timestamps are naive "Y-m-d\TH:i"
    // (Cairo wall clock), matching the planner's GTFS frame — see
    // JourneyPlannerService::search. Using offset-carrying ISO here would
    // silently shift every scenario by the UTC offset.
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
     * Create a direct Tahrir -> Garden City journey (walk -> metro -> walk)
     * for the user and start it, returning the active journey id.
     */
    private function startRidingJourney(?User $user = null, string $startTime = '07:30'): int
    {
        $origin = $this->nearStop($this->stopA);
        $destination = $this->nearStop($this->stopC);

        $journeyId = $this->actingAs($user ?? $this->user)
            ->postJson('/api/v1/journeys', [
                'origin_lat' => $origin['lat'],
                'origin_lng' => $origin['lng'],
                'destination_lat' => $destination['lat'],
                'destination_lng' => $destination['lng'],
                'requested_at' => Carbon::today()->setTime(7, 30)->format('Y-m-d\TH:i'), // naive = Cairo wall (GTFS frame)
            ])
            ->assertStatus(201)
            ->json('data.id');

        return $this->actingAs($user ?? $this->user)
            ->postJson("/api/v1/journeys/{$journeyId}/start", [
                'started_at' => Carbon::today()->setTimeFromTimeString($startTime)->format('Y-m-d\TH:i'),
            ])
            ->assertStatus(201)
            ->json('data.id');
    }

    private function sendLocation(int $activeJourneyId, array $body, ?User $user = null)
    {
        return $this->actingAs($user ?? $this->user)
            ->postJson("/api/v1/active-journeys/{$activeJourneyId}/location", $body);
    }

    /**
     * Record a stop event at the metro boarding stop (Tahrir).
     */
    private function boardAtOriginStop(int $activeJourneyId, string $time = '07:31', ?User $user = null): void
    {
        $this->sendLocation($activeJourneyId, [
            'latitude' => (float) $this->stopA->latitude,
            'longitude' => (float) $this->stopA->longitude,
            'recorded_at' => Carbon::today()->setTimeFromTimeString($time)->format('Y-m-d\TH:i'),
        ], $user)->assertStatus(200);
    }

    /** @test */
    public function normal_movement_along_the_leg_produces_no_deviation()
    {
        $activeId = $this->startRidingJourney();

        // Board at Tahrir, then report a position on the corridor (~11 m off
        // the A->C segment, near Opera Square).
        $this->boardAtOriginStop($activeId);
        $response = $this->sendLocation($activeId, [
            'latitude' => 30.0532,
            'longitude' => 31.2432,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertEquals('active', $data['status']);
        $this->assertNull($data['tracking']['deviation']);
        $this->assertArrayNotHasKey('deviation', $data);
        $this->assertEquals(0, DeviationEvent::count());
    }

    /** @test */
    public function no_deviation_is_detected_before_boarding()
    {
        $activeId = $this->startRidingJourney();

        // Far from every stop during the access walk: no deviation yet,
        // because the user has not boarded a transit leg.
        $response = $this->sendLocation($activeId, [
            'latitude' => 30.0900,
            'longitude' => 31.3000,
            'recorded_at' => Carbon::today()->setTime(7, 35)->format('Y-m-d\TH:i'),
        ]);

        $response->assertStatus(200);
        $this->assertEquals('active', $response->json('data.status'));
        $this->assertEquals(0, DeviationEvent::count());
    }

    /** @test */
    public function no_deviation_after_alighting_at_the_destination_stop()
    {
        $activeId = $this->startRidingJourney();

        $this->boardAtOriginStop($activeId);
        // Arrive at Garden City, then report a very late position there:
        // the leg is complete, so no missed-stop event.
        $this->sendLocation($activeId, [
            'latitude' => (float) $this->stopC->latitude,
            'longitude' => (float) $this->stopC->longitude,
            'recorded_at' => Carbon::today()->setTime(8, 11)->format('Y-m-d\TH:i'),
        ]);

        $response = $this->sendLocation($activeId, [
            'latitude' => (float) $this->stopC->latitude,
            'longitude' => (float) $this->stopC->longitude,
            'recorded_at' => Carbon::today()->setTime(9, 30)->format('Y-m-d\TH:i'),
        ]);

        $this->assertEquals('active', $response->json('data.status'));
        $this->assertEquals(0, DeviationEvent::count());
    }

    /** @test */
    public function off_route_movement_triggers_a_deviated_state()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);

        // ~650 m north of the corridor.
        $response = $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals('deviated', $data['status']);
        $this->assertEquals('off_route', $data['deviation']['deviation_type']);
        $this->assertEquals('medium', $data['deviation']['severity']);
        $this->assertTrue($data['deviation']['can_continue']);
        $this->assertEquals($this->stopC->id, $data['deviation']['expected_stop_id']);
        $this->assertNotNull($data['tracking']['deviation']);

        $this->assertDatabaseHas('deviation_events', [
            'active_journey_id' => $activeId,
            'deviation_type' => 'off_route',
            'severity' => 'medium',
            'expected_stop_id' => $this->stopC->id,
        ]);
        $this->assertDatabaseHas('active_journeys', [
            'id' => $activeId,
            'status' => 'deviated',
        ]);
    }

    /** @test */
    public function far_off_route_movement_is_high_severity_and_cannot_continue()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);

        $response = $this->sendLocation($activeId, [
            'latitude' => 30.0900,
            'longitude' => 31.3000,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        $data = $response->json('data');
        $this->assertEquals('deviated', $data['status']);
        $this->assertEquals('off_route', $data['deviation']['deviation_type']);
        $this->assertEquals('high', $data['deviation']['severity']);
        $this->assertFalse($data['deviation']['can_continue']);
    }

    /** @test */
    public function passing_the_planned_arrival_triggers_a_missed_stop_event()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId, '07:31');

        // Still on the corridor, but 20 minutes past the 08:20 planned
        // arrival at Garden City (grace period: 15 minutes).
        $response = $this->sendLocation($activeId, [
            'latitude' => 30.0532,
            'longitude' => 31.2432,
            'recorded_at' => Carbon::today()->setTime(8, 40)->format('Y-m-d\TH:i'),
        ]);

        $data = $response->json('data');
        $this->assertEquals('deviated', $data['status']);
        $this->assertEquals('missed_stop', $data['deviation']['deviation_type']);
        $this->assertEquals('medium', $data['deviation']['severity']);
        $this->assertTrue($data['deviation']['can_continue']);
        $this->assertEquals($this->stopC->id, $data['deviation']['expected_stop_id']);
    }

    /** @test */
    public function arriving_within_the_grace_period_does_not_trigger_missed_stop()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId, '07:31');

        // Still on the corridor 5 minutes after the planned arrival: within
        // the 15 minute grace period.
        $response = $this->sendLocation($activeId, [
            'latitude' => 30.0532,
            'longitude' => 31.2432,
            'recorded_at' => Carbon::today()->setTime(8, 15)->format('Y-m-d\TH:i'),
        ]);

        $this->assertEquals('active', $response->json('data.status'));
        $this->assertEquals(0, DeviationEvent::count());
    }

    /** @test */
    public function no_further_detection_while_already_deviated()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);

        $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);
        // A wildly off-route position while already deviated must not create
        // a second event.
        $this->sendLocation($activeId, [
            'latitude' => 30.0900,
            'longitude' => 31.3000,
            'recorded_at' => Carbon::today()->setTime(7, 55)->format('Y-m-d\TH:i'),
        ]);

        $this->assertEquals(1, DeviationEvent::count());
    }

    /** @test */
    public function recovery_options_are_generated_from_the_deviation_point()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);
        $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", []);

        $response->assertStatus(200);
        $options = $response->json('data');


        $this->assertGreaterThanOrEqual(2, count($options), 'Expected multiple recovery options.');

        foreach ($options as $option) {
            $this->assertNotNull($option['alternative_journey_id']);
            $this->assertNotNull($option['alternative_journey']);
            $this->assertNotEmpty($option['alternative_journey']['legs']);
            $this->assertGreaterThanOrEqual(0, $option['estimated_delay_sec']);
            $this->assertNull($option['accepted_at']);
        }

        // Sorted by estimated delay, best first.
        $delays = collect($options)->pluck('estimated_delay_sec');
        $this->assertEquals($delays->sort()->values()->all(), $delays->values()->all());

        // Alternatives are persisted journeys owned by the user.
        $this->assertDatabaseCount('recovery_routes', count($options));
        $this->assertDatabaseHas('journeys', [
            'id' => $options[0]['alternative_journey_id'],
            'user_id' => $this->user->id,
            'status' => 'planned',
        ]);
    }

    /** @test */
    public function regenerating_recovery_options_replaces_unaccepted_ones()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);
        $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        $first = $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", [])
            ->json('data');
        $second = $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", [])
            ->json('data');

        $firstIds = collect($first)->pluck('id');
        $secondIds = collect($second)->pluck('id');
        $this->assertEquals(0, $firstIds->intersect($secondIds)->count(), 'Unaccepted options must be replaced.');
        $this->assertEquals(count($second), RecoveryRoute::count());
    }

    /** @test */
    public function user_can_resume_a_deviated_journey_when_severity_allows_it()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);
        $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/resume");

        $response->assertStatus(200);
        $this->assertEquals('active', $response->json('data.status'));
        $this->assertNull($response->json('data.tracking.deviation'));
    }

    /** @test */
    public function resume_is_rejected_for_high_severity_deviations()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);
        $this->sendLocation($activeId, [
            'latitude' => 30.0900,
            'longitude' => 31.3000,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/resume");

        $response->assertStatus(409);
        $this->assertDatabaseHas('active_journeys', ['id' => $activeId, 'status' => 'deviated']);
    }

    /** @test */
    public function accepting_a_recovery_option_reroutes_the_journey()
    {
        $activeId = $this->startRidingJourney();
        $originalJourneyId = ActiveJourney::find($activeId)->journey_id;
        $this->boardAtOriginStop($activeId);
        $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        $options = $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", [])
            ->json('data');
        $chosen = $options[0];

        $response = $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options/{$chosen['id']}/accept");

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertEquals('rerouted', $data['status']);
        $this->assertEquals($chosen['alternative_journey_id'], $data['journey_id']);
        $this->assertEquals(0, $data['current_leg_index']);

        $this->assertNotNull(RecoveryRoute::find($chosen['id'])->accepted_at);

        // The active journey now follows the alternative plan, but the
        // original journey and its legs remain untouched.
        $this->assertDatabaseHas('journeys', [
            'id' => $originalJourneyId,
            'status' => 'planned',
        ]);
        $originalJourney = Journey::with('journeyLegs')->find($originalJourneyId);
        $this->assertCount(3, $originalJourney->journeyLegs);
    }

    /** @test */
    public function a_rerouted_journey_can_be_deviated_again_and_completed()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);
        $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        $options = $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", [])
            ->json('data');
        $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options/{$options[0]['id']}/accept")
            ->assertStatus(200);

        // Re-board on the rerouted plan at its actual transit boarding stop.
        $activeJourney = ActiveJourney::find($activeId);
        $reroutedBoardingStop = $activeJourney->journey->journeyLegs
            ->sortBy('sequence')
            ->first(fn ($leg) => $leg->transit_stop_from_id !== null)
            ?->transitStopFrom ?? $this->stopA;

        $this->sendLocation($activeId, [
            'latitude' => (float) $reroutedBoardingStop->latitude,
            'longitude' => (float) $reroutedBoardingStop->longitude,
            'recorded_at' => Carbon::today()->setTime(7, 55)->format('Y-m-d\TH:i'),
        ]);
        $deviated = $this->sendLocation($activeId, [
            // Far enough off any rerouted corridor (recovery widens boarding
            // to 2 km, so the point must sit well beyond that from the rails)
            // while staying in the fixture's geography.
            'latitude' => 30.0790,
            'longitude' => 31.2720,
            'recorded_at' => Carbon::today()->setTime(7, 58)->format('Y-m-d\TH:i'),
        ]);
        $this->assertEquals('deviated', $deviated->json('data.status'));
        $this->assertEquals(2, DeviationEvent::count());

        // Complete the journey from the second deviation.
        $completed = $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/complete");

        $completed->assertStatus(200);
        $this->assertEquals('completed', $completed->json('data.status'));
    }

    /** @test */
    public function user_can_cancel_from_a_deviated_state()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);
        $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        $cancelled = $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/cancel");
        $cancelled->assertStatus(200);
        $this->assertEquals('cancelled', $cancelled->json('data.status'));
    }

    /** @test */
    public function terminal_and_non_deviated_states_reject_recovery_actions()
    {
        $activeId = $this->startRidingJourney();

        // Still active: recovery actions are conflicts.
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", [])->assertStatus(409);
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/resume")->assertStatus(409);

        // Completed: everything is terminal.
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/complete")->assertStatus(200);
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", [])->assertStatus(409);
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/resume")->assertStatus(409);
    }

    /** @test */
    public function accept_rejects_unknown_or_foreign_or_already_accepted_options()
    {
        // Foreign recovery option: two users, each with a deviated journey.
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);
        $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);
        $options = $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", [])
            ->json('data');

        $foreignActiveId = $this->startRidingJourney($this->otherUser);
        $this->boardAtOriginStop($foreignActiveId, '07:31', $this->otherUser);
        $this->sendLocation($foreignActiveId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ], $this->otherUser);

        // Unknown id -> 404.
        $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options/99999/accept")
            ->assertStatus(404);

        // Another journey's option -> 409.
        $this->actingAs($this->otherUser)
            ->postJson("/api/v1/active-journeys/{$foreignActiveId}/recovery-options/{$options[0]['id']}/accept")
            ->assertStatus(409);

        // Double accept -> 409.
        $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options/{$options[0]['id']}/accept")
            ->assertStatus(200);
        $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options/{$options[0]['id']}/accept")
            ->assertStatus(409);
    }

    /** @test */
    public function deviations_endpoint_lists_events_with_recovery_routes()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);
        $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);
        $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", [])
            ->assertStatus(200);

        $response = $this->actingAs($this->user)->getJson("/api/v1/active-journeys/{$activeId}/deviations");
        $response->assertStatus(200);

        $events = $response->json('data');
        $this->assertCount(1, $events);
        $this->assertEquals('off_route', $events[0]['deviation_type']);
        $this->assertEquals('medium', $events[0]['severity']);
        $this->assertTrue($events[0]['can_continue']);
        $this->assertNotEmpty($events[0]['recovery_routes']);
    }

    /** @test */
    public function deviations_and_recovery_require_authentication()
    {
        $this->getJson('/api/v1/active-journeys/1/deviations')->assertStatus(401);
        $this->postJson('/api/v1/active-journeys/1/resume')->assertStatus(401);
        $this->getJson('/api/v1/active-journeys/1/recovery-options')->assertStatus(401);
        $this->postJson('/api/v1/active-journeys/1/recovery-options', [])->assertStatus(401);
        $this->postJson('/api/v1/active-journeys/1/recovery-options/1/accept')->assertStatus(401);
    }

    /** @test */
    public function owner_only_mutations_and_owner_or_admin_reads()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);
        $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        // Reads: owner and admin ok, others 403.
        $this->actingAs($this->admin)->getJson("/api/v1/active-journeys/{$activeId}/deviations")->assertStatus(200);
        $this->actingAs($this->admin)->getJson("/api/v1/active-journeys/{$activeId}/recovery-options")->assertStatus(200);
        $this->actingAs($this->otherUser)->getJson("/api/v1/active-journeys/{$activeId}/deviations")->assertStatus(403);

        // Mutations: strictly owner-only.
        $this->actingAs($this->admin)->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", [])->assertStatus(403);
        $this->actingAs($this->otherUser)->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", [])->assertStatus(403);
        $this->actingAs($this->otherUser)->postJson("/api/v1/active-journeys/{$activeId}/resume")->assertStatus(403);
        $this->actingAs($this->otherUser)->postJson("/api/v1/active-journeys/{$activeId}/recovery-options/1/accept")->assertStatus(403);

        $this->assertDatabaseHas('active_journeys', ['id' => $activeId, 'status' => 'deviated']);
    }

    /** @test */
    public function recovery_options_validation()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);
        $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", ['max_options' => 10])
            ->assertStatus(422);
        $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", ['max_options' => 2])
            ->assertStatus(200);
    }

    /** @test */
    public function polyline_corridor_avoids_false_positives_on_curved_transit_legs()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);

        // Attach a curved polyline to the transit leg
        $active = ActiveJourney::with('journey.journeyLegs')->find($activeId);
        $transitLeg = $active->journey->journeyLegs->firstWhere('transit_stop_from_id', $this->stopA->id);
        $transitLeg->update([
            'geometry' => [
                [(float) $this->stopA->latitude, (float) $this->stopA->longitude],
                [30.0600, 31.2500], // Bends significantly east
                [(float) $this->stopC->latitude, (float) $this->stopC->longitude],
            ],
        ]);

        // Point near the curve apex (30.0600, 31.2502 is ~20m from the polyline vertex)
        // Straight-line distance from A to C would be ~800m off, causing a false deviation under the old code.
        $response = $this->sendLocation($activeId, [
            'latitude' => 30.0600,
            'longitude' => 31.2502,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        $response->assertStatus(200);
        $this->assertEquals('active', $response->json('data.status'));
        $this->assertNull($response->json('data.tracking.deviation'));
    }

    /** @test */
    public function accuracy_greater_than_120m_is_stored_but_skips_deviation_and_leg_advancement()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);

        // Wildly off-route point, but with weak GPS accuracy of 150m (> 120m threshold)
        $response = $this->sendLocation($activeId, [
            'latitude' => 30.0900,
            'longitude' => 31.3000,
            'accuracy_meters' => 150,
            'recorded_at' => Carbon::today()->setTime(7, 50)->format('Y-m-d\TH:i'),
        ]);

        $response->assertStatus(200);
        // Journey must stay active (no false deviation fired from noisy GPS)
        $this->assertEquals('active', $response->json('data.status'));
        $this->assertNull($response->json('data.tracking.deviation'));

        // But the location reading must be recorded in journey_progress with accuracy_meters
        $this->assertDatabaseHas('journey_progress', [
            'active_journey_id' => $activeId,
            'latitude' => 30.0900,
            'longitude' => 31.3000,
            'accuracy_meters' => 150,
        ]);
    }

    /** @test */
    public function early_missed_stop_overshoot_fires_in_120s_with_alight_advice()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId, '07:31');

        // Planned arrival at Garden City (stopC) is 08:20.
        // Send a location 125 seconds past arrival (08:22:05), moving away at speed 1.8 m/s, >250m past stop.
        $response = $this->sendLocation($activeId, [
            'latitude' => (float) $this->stopC->latitude + 0.0035, // ~380m past stop
            'longitude' => (float) $this->stopC->longitude + 0.0035,
            'speed_mps' => 1.8,
            'recorded_at' => Carbon::today()->setTime(8, 22, 5)->format('Y-m-d\TH:i:s'),
        ]);

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertEquals('deviated', $data['status']);
        $this->assertEquals('missed_stop', $data['deviation']['deviation_type']);
        $this->assertEquals('medium', $data['deviation']['severity']);
        $this->assertTrue($data['deviation']['can_continue']);
        $this->assertStringContainsString('انزل الجاية', $data['deviation']['description']);
        $this->assertStringContainsString('راجع إلى', $data['deviation']['description']);
    }

    /** @test */
    public function tracking_state_includes_distance_eta_delay_and_distance_remaining()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);

        $response = $this->sendLocation($activeId, [
            'latitude' => 30.0532,
            'longitude' => 31.2432,
            'speed_mps' => 1.5,
            'recorded_at' => Carbon::today()->setTime(7, 45)->format('Y-m-d\TH:i'),
        ]);

        $response->assertStatus(200);
        $tracking = $response->json('data.tracking');
        $this->assertArrayHasKey('remaining_eta_sec', $tracking);
        $this->assertArrayHasKey('delay_sec', $tracking);
        $this->assertArrayHasKey('distance_remaining_m', $tracking);
        $this->assertNotNull($tracking['remaining_eta_sec']);
        $this->assertNotNull($tracking['distance_remaining_m']);
        $this->assertGreaterThan(0, $tracking['distance_remaining_m']);
    }
}
