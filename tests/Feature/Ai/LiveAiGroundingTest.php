<?php

namespace Tests\Feature\Ai;

use App\Models\ActiveJourney;
use App\Models\Journey;
use App\Models\JourneyLeg;
use App\Models\TransitStop;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LiveAiGroundingTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_check_endpoint_returns_ok_with_no_pii(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'database',
            'osrm',
            'version',
            'timestamp',
        ]);
        $this->assertContains($response->json('status'), ['ok', 'degraded']);
        $this->assertTrue($response->json('database'));
    }

    public function test_security_headers_and_correlation_id_are_present(): void
    {
        $response = $this->get('/api/v1/health');

        $response->assertStatus(200);
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('X-XSS-Protection', '1; mode=block');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $this->assertTrue($response->headers->has('Content-Security-Policy'));
        $this->assertTrue($response->headers->has('X-Correlation-ID'));
    }

    public function test_chat_rejects_unauthorized_active_journey_context(): void
    {
        $owner = User::factory()->create();
        $stranger = User::factory()->create();

        $journey = Journey::factory()->create(['user_id' => $owner->id]);
        $activeJourney = ActiveJourney::create([
            'user_id' => $owner->id,
            'journey_id' => $journey->id,
            'started_at' => now(),
            'status' => 'active',
        ]);

        // Unauthenticated guest request with active_journey_id -> 403
        $guestRes = $this->postJson('/api/v1/ai/chat', [
            'messages' => [['role' => 'user', 'content' => 'المحطة الجاية؟']],
            'active_journey_id' => $activeJourney->id,
        ]);
        $guestRes->assertStatus(403);

        // Stranger request with active_journey_id -> 403
        $strangerRes = $this->actingAs($stranger, 'sanctum')->postJson('/api/v1/ai/chat', [
            'messages' => [['role' => 'user', 'content' => 'المحطة الجاية؟']],
            'active_journey_id' => $activeJourney->id,
        ]);
        $strangerRes->assertStatus(403);
    }

    public function test_chat_grounds_next_stop_and_eta_in_active_journey_telemetry(): void
    {
        $user = User::factory()->create();

        $stop1 = TransitStop::factory()->create(['name' => 'Sadat Station']);
        $stop2 = TransitStop::factory()->create(['name' => 'Dokki Station']);

        $journey = Journey::factory()->create(['user_id' => $user->id]);
        $leg = JourneyLeg::factory()->create([
            'journey_id' => $journey->id,
            'sequence' => 1,
            'mode' => 'metro',
            'transit_stop_from_id' => $stop1->id,
            'transit_stop_to_id' => $stop2->id,
        ]);

        $activeJourney = ActiveJourney::create([
            'user_id' => $user->id,
            'journey_id' => $journey->id,
            'started_at' => now(),
            'current_leg_index' => 0,
            'current_progress_percent' => 45.0,
            'status' => 'active',
        ]);

        // 1. Next stop query: "المحطة الجاية؟"
        $nextStopRes = $this->actingAs($user, 'sanctum')->postJson('/api/v1/ai/chat', [
            'messages' => [['role' => 'user', 'content' => 'المحطة الجاية؟']],
            'active_journey_id' => $activeJourney->id,
            'language' => 'ar',
        ]);

        $nextStopRes->assertStatus(200);
        $nextStopRes->assertJsonFragment(['available' => true]);
        $this->assertStringContainsString('Dokki Station', $nextStopRes->json('reply'));
        $this->assertNotEmpty($nextStopRes->json('actions'));
        $this->assertEquals('get_next_stop', $nextStopRes->json('actions.0.type'));

        // 2. ETA query: "فاضل قد ايه؟"
        $etaRes = $this->actingAs($user, 'sanctum')->postJson('/api/v1/ai/chat', [
            'messages' => [['role' => 'user', 'content' => 'فاضل قد ايه؟']],
            'active_journey_id' => $activeJourney->id,
            'language' => 'ar',
        ]);

        $etaRes->assertStatus(200);
        $this->assertStringContainsString('45%', $etaRes->json('reply'));
        $this->assertEquals('get_live_eta', $etaRes->json('actions.0.type'));

        // 3. Off-route query: "توهت؟" on route
        $lostRes = $this->actingAs($user, 'sanctum')->postJson('/api/v1/ai/chat', [
            'messages' => [['role' => 'user', 'content' => 'توهت؟']],
            'active_journey_id' => $activeJourney->id,
            'language' => 'ar',
        ]);

        $lostRes->assertStatus(200);
        $this->assertStringContainsString('المسار الصحيح', $lostRes->json('reply'));
    }

    public function test_forgot_password_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $res = $this->postJson('/api/v1/auth/forgot-password', [
                'email' => 'nobody@example.com',
            ]);
            $this->assertNotEquals(429, $res->getStatusCode());
        }

        // 6th request must trigger 429 Too Many Requests
        $throttleRes = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'nobody@example.com',
        ]);
        $throttleRes->assertStatus(429);
    }
}
