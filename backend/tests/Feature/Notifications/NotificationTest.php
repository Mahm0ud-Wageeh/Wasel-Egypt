<?php

namespace Tests\Feature\Notifications;

use App\Models\Notification;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Feature\Journey\CreatesJourneyNetwork;

class NotificationTest extends TestCase
{
    use RefreshDatabase;
    use CreatesJourneyNetwork;

    private User $user;
    private User $otherUser;
    private User $moderator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createJourneyNetwork();
        $this->user = User::factory()->create();
        $this->otherUser = User::factory()->create();
        $this->moderator = User::factory()->create();
        $this->moderator->roles()->create(['name' => 'moderator', 'description' => 'Moderator']);
    }

    /* ---------------------------- helpers ---------------------------- */

    private function startRidingJourney(?User $user = null): int
    {
        $origin = $this->nearStop($this->stopA);
        $destination = $this->nearStop($this->stopC);

        $journeyId = $this->actingAs($user ?? $this->user)
            ->postJson('/api/v1/journeys', [
                'origin_lat' => $origin['lat'],
                'origin_lng' => $origin['lng'],
                'destination_lat' => $destination['lat'],
                'destination_lng' => $destination['lng'],
                'requested_at' => Carbon::today()->setTime(7, 30)->toIso8601String(),
            ])
            ->assertStatus(201)
            ->json('data.id');

        return $this->actingAs($user ?? $this->user)
            ->postJson("/api/v1/journeys/{$journeyId}/start", [
                'started_at' => Carbon::today()->setTime(7, 30)->toIso8601String(),
            ])
            ->assertStatus(201)
            ->json('data.id');
    }

    private function sendLocation(int $activeJourneyId, array $body, ?User $user = null)
    {
        return $this->actingAs($user ?? $this->user)
            ->postJson("/api/v1/active-journeys/{$activeJourneyId}/location", $body);
    }

    private function boardAtOriginStop(int $activeJourneyId): void
    {
        $this->sendLocation($activeJourneyId, [
            'latitude' => (float) $this->stopA->latitude,
            'longitude' => (float) $this->stopA->longitude,
            'recorded_at' => Carbon::today()->setTime(7, 31)->toIso8601String(),
        ])->assertStatus(200);
    }

    private function types(int $userId): array
    {
        return Notification::where('user_id', $userId)
            ->get()
            ->pluck('data_payload.type')
            ->all();
    }

    /* ------------------------- service basics ------------------------ */

    /** @test */
    public function service_creates_an_inapp_notification_with_type_and_priority()
    {
        $service = new NotificationService();
        $notification = $service->send($this->user->id, 'journey_deviation', [
            'deviation_type' => 'off_route',
            'label' => 'off-route',
            'severity' => 'medium',
            'active_journey_id' => 1,
        ]);

        $this->assertEquals('inapp', $notification->sent_via);
        $this->assertEquals('high', $notification->priority);
        $this->assertEquals('journey_deviation', $notification->data_payload['type']);
        $this->assertNull($notification->read_at);
        $this->assertStringContainsString('off-route', $notification->body);
        $this->assertStringContainsString('medium', $notification->body);
    }

    /** @test */
    public function service_rejects_unknown_types()
    {
        $this->expectException(\InvalidArgumentException::class);

        (new NotificationService())->send($this->user->id, 'unknown_type');
    }

    /** @test */
    public function dedupe_key_prevents_duplicate_notifications()
    {
        $service = new NotificationService();

        $first = $service->send($this->user->id, 'recovery_options_ready', ['count' => 2], dedupeKey: 'recovery_options:7');
        $second = $service->send($this->user->id, 'recovery_options_ready', ['count' => 2], dedupeKey: 'recovery_options:7');

        $this->assertNotNull($first);
        $this->assertNull($second);
        $this->assertEquals(1, Notification::where('user_id', $this->user->id)->count());
    }

    /* --------------------- automatic event triggers ------------------- */

    /** @test */
    public function starting_a_journey_notifies_the_owner()
    {
        $activeId = $this->startRidingJourney();

        $this->assertEquals(['journey_started'], $this->types($this->user->id));
        $this->assertEquals(0, Notification::where('user_id', $this->otherUser->id)->count());

        $notification = Notification::where('user_id', $this->user->id)->first();
        $this->assertEquals('normal', $notification->priority);
        $this->assertEquals($activeId, $notification->data_payload['active_journey_id']);
    }

    /** @test */
    public function deviation_detection_notifies_the_owner_with_high_priority()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);

        // ~460 m off the corridor.
        $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->toIso8601String(),
        ]);

        $notification = Notification::where('user_id', $this->user->id)
            ->where('data_payload->type', 'journey_deviation')
            ->first();

        $this->assertNotNull($notification);
        $this->assertEquals('high', $notification->priority);
        $this->assertEquals('off_route', $notification->data_payload['deviation_type']);
        $this->assertEquals('medium', $notification->data_payload['severity']);
    }

    /** @test */
    public function recovery_generation_and_reroute_acceptance_notify_the_owner_once()
    {
        $activeId = $this->startRidingJourney();
        $this->boardAtOriginStop($activeId);
        $this->sendLocation($activeId, [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->toIso8601String(),
        ]);

        // Generate options twice: only one "options ready" notification.
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", [])->assertStatus(200);
        $options = $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", [])->json('data');

        $this->assertEquals(1, Notification::where('user_id', $this->user->id)
            ->where('data_payload->type', 'recovery_options_ready')->count());

        // Accept a recovery option.
        $this->actingAs($this->user)
            ->postJson("/api/v1/active-journeys/{$activeId}/recovery-options/{$options[0]['id']}/accept")
            ->assertStatus(200);

        $this->assertContains('journey_rerouted', $this->types($this->user->id));
    }

    /** @test */
    public function completing_and_cancelling_notify_the_owner()
    {
        $activeId = $this->startRidingJourney();

        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/complete")->assertStatus(200);
        $this->assertContains('journey_completed', $this->types($this->user->id));

        $this->startRidingJourney();
        $secondActiveId = ActiveJourneyNotificationIdHelper::latestFor($this->user);
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$secondActiveId}/cancel")->assertStatus(200);
        $this->assertContains('journey_cancelled', $this->types($this->user->id));
    }

    /** @test */
    public function moderation_outcomes_notify_the_report_author()
    {
        $reportId = $this->actingAs($this->user)
            ->postJson('/api/v1/reports', [
                'report_type' => 'delay',
                'description' => 'The morning metro departed ten minutes late.',
                'latitude' => (float) $this->stopA->latitude,
                'longitude' => (float) $this->stopA->longitude,
                'related_stop_id' => $this->stopA->id,
            ])
            ->assertStatus(201)
            ->json('data.id');

        $this->actingAs($this->moderator)
            ->postJson("/api/v1/reports/{$reportId}/moderate", ['action_taken' => 'verify'])
            ->assertStatus(200);
        $this->actingAs($this->moderator)
            ->postJson("/api/v1/reports/{$reportId}/moderate", ['action_taken' => 'resolve'])
            ->assertStatus(200);

        $this->assertEqualsCanonicalizing(
            ['report_verified', 'report_resolved'],
            $this->types($this->user->id)
        );

        // The moderator receives nothing.
        $this->assertEquals(0, Notification::where('user_id', $this->moderator->id)->count());
    }

    /* --------------------------- API: listing ------------------------- */

    private function seedNotifications(User $user, int $count, string $type = 'journey_started'): void
    {
        $service = new NotificationService();
        for ($i = 0; $i < $count; $i++) {
            $service->send($user->id, $type, ['index' => $i]);
        }
    }

    /** @test */
    public function user_can_list_their_notifications_with_meta()
    {
        $this->seedNotifications($this->user, 3);

        $response = $this->actingAs($this->user)->getJson('/api/v1/notifications');

        $response->assertStatus(200);
        $this->assertCount(3, $response->json('data'));
        $this->assertEquals(3, $response->json('meta.total'));
        $this->assertEquals(3, $response->json('meta.unread_count'));
    }

    /** @test */
    public function listing_is_private_to_the_owner()
    {
        $this->seedNotifications($this->user, 2);
        $this->seedNotifications($this->otherUser, 1);

        $mine = $this->actingAs($this->user)->getJson('/api/v1/notifications');
        $theirs = $this->actingAs($this->otherUser)->getJson('/api/v1/notifications');

        $this->assertCount(2, $mine->json('data'));
        $this->assertCount(1, $theirs->json('data'));
    }

    /** @test */
    public function listing_supports_unread_type_and_priority_filters()
    {
        $service = new NotificationService();
        $service->send($this->user->id, 'journey_deviation', ['deviation_type' => 'off_route', 'severity' => 'high']);
        $service->send($this->user->id, 'journey_started');
        $service->send($this->user->id, 'journey_completed', ['duration' => 30, 'priority' => 'urgent']);

        $unread = $this->actingAs($this->user)->getJson('/api/v1/notifications?unread=1');
        $this->assertCount(3, $unread->json('data'));

        $byType = $this->actingAs($this->user)->getJson('/api/v1/notifications?type=journey_started');
        $this->assertCount(1, $byType->json('data'));

        $byPriority = $this->actingAs($this->user)->getJson('/api/v1/notifications?priority=urgent');
        $this->assertCount(1, $byPriority->json('data'));
        $this->assertEquals('journey_completed', $byPriority->json('data.0.type'));

        $invalid = $this->actingAs($this->user)->getJson('/api/v1/notifications?type=bogus');
        $invalid->assertStatus(422);
    }

    /** @test */
    public function listing_accepts_boolean_query_strings_for_unread_filter()
    {
        $this->seedNotifications($this->user, 2);

        // Browsers/clients serialize booleans as "true"/"false" strings —
        // these must filter, not 422 (regression: our own client sends this).
        $asTrue = $this->actingAs($this->user)->getJson('/api/v1/notifications?unread=true');
        $asTrue->assertStatus(200);
        $this->assertCount(2, $asTrue->json('data'));

        $asFalse = $this->actingAs($this->user)->getJson('/api/v1/notifications?unread=false');
        $asFalse->assertStatus(200);
        $this->assertCount(2, $asFalse->json('data'));

        // Genuine garbage still fails validation.
        $this->actingAs($this->user)->getJson('/api/v1/notifications?unread=maybe')->assertStatus(422);
    }

    /** @test */
    public function listing_is_paginated()
    {
        $this->seedNotifications($this->user, 5);

        $response = $this->actingAs($this->user)->getJson('/api/v1/notifications?per_page=2&page=2');

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
        $this->assertEquals(2, $response->json('meta.current_page'));
        $this->assertEquals(5, $response->json('meta.total'));
    }

    /* ------------------------- API: read state ------------------------ */

    /** @test */
    public function user_can_mark_a_single_notification_as_read()
    {
        $service = new NotificationService();
        $n1 = $service->send($this->user->id, 'journey_started');
        $n2 = $service->send($this->user->id, 'journey_started');

        $response = $this->actingAs($this->user)->postJson("/api/v1/notifications/{$n1->id}/read");
        $response->assertStatus(200);
        $this->assertNotNull($response->json('data.read_at'));

        $this->assertEquals(1, $this->actingAs($this->user)->getJson('/api/v1/notifications/unread-count')->json('data.count'));

        // Idempotent.
        $this->actingAs($this->user)->postJson("/api/v1/notifications/{$n1->id}/read")->assertStatus(200);
        $this->assertEquals(1, Notification::where('user_id', $this->user->id)->whereNotNull('read_at')->count());

        // The other notification is untouched.
        $this->assertNull($n2->refresh()->read_at);
    }

    /** @test */
    public function user_can_mark_all_notifications_as_read()
    {
        $this->seedNotifications($this->user, 4);

        $response = $this->actingAs($this->user)->postJson('/api/v1/notifications/read-all');
        $response->assertStatus(200);
        $this->assertEquals(4, $response->json('data.marked_read'));

        $this->assertEquals(0, $this->actingAs($this->user)->getJson('/api/v1/notifications/unread-count')->json('data.count'));

        // Second run marks nothing.
        $again = $this->actingAs($this->user)->postJson('/api/v1/notifications/read-all');
        $this->assertEquals(0, $again->json('data.marked_read'));
    }

    /** @test */
    public function read_state_is_strictly_owned()
    {
        $service = new NotificationService();
        $n = $service->send($this->user->id, 'journey_started');

        // Another user cannot read/mark/delete it.
        $this->actingAs($this->otherUser)->postJson("/api/v1/notifications/{$n->id}/read")->assertStatus(403);
        $this->actingAs($this->otherUser)->deleteJson("/api/v1/notifications/{$n->id}")->assertStatus(403);

        // Admins are not exempt: notifications are personal.
        $admin = User::factory()->create();
        $admin->roles()->create(['name' => 'admin', 'description' => 'Administrator']);
        $this->actingAs($admin)->postJson("/api/v1/notifications/{$n->id}/read")->assertStatus(403);

        // Unknown ids.
        $this->actingAs($this->user)->postJson('/api/v1/notifications/99999/read')->assertStatus(404);
        $this->actingAs($this->user)->deleteJson('/api/v1/notifications/99999')->assertStatus(404);

        // Owner can mark it.
        $this->actingAs($this->user)->postJson("/api/v1/notifications/{$n->id}/read")->assertStatus(200);
    }

    /** @test */
    public function user_can_delete_their_notification()
    {
        $service = new NotificationService();
        $n = $service->send($this->user->id, 'journey_started');

        $this->actingAs($this->user)->deleteJson("/api/v1/notifications/{$n->id}")->assertStatus(200);
        $this->assertSoftDeleted('notifications', ['id' => $n->id]);
        $this->actingAs($this->user)->getJson('/api/v1/notifications')->assertJsonCount(0, 'data');
    }

    /** @test */
    public function notification_endpoints_require_authentication()
    {
        $this->getJson('/api/v1/notifications')->assertStatus(401);
        $this->getJson('/api/v1/notifications/unread-count')->assertStatus(401);
        $this->postJson('/api/v1/notifications/1/read')->assertStatus(401);
        $this->postJson('/api/v1/notifications/read-all')->assertStatus(401);
        $this->deleteJson('/api/v1/notifications/1')->assertStatus(401);
    }
}

/**
 * Small helper to fetch the newest active journey id for a user in tests.
 */
class ActiveJourneyNotificationIdHelper
{
    public static function latestFor(User $user): int
    {
        return \App\Models\ActiveJourney::where('user_id', $user->id)
            ->orderByDesc('id')
            ->first()
            ->id;
    }
}
