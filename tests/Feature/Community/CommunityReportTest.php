<?php

namespace Tests\Feature\Community;

use App\Models\AuditLog;
use App\Models\CommunityReport;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Feature\Journey\CreatesJourneyNetwork;

class CommunityReportTest extends TestCase
{
    use RefreshDatabase;
    use CreatesJourneyNetwork;

    private User $user;
    private User $otherUser;
    private User $moderator;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createJourneyNetwork();
        $this->user = User::factory()->create();
        $this->otherUser = User::factory()->create();
        $this->moderator = User::factory()->create();
        $this->moderator->roles()->create(['name' => 'moderator', 'description' => 'Moderator']);
        $this->admin = User::factory()->create();
        $this->admin->roles()->create(['name' => 'admin', 'description' => 'Administrator']);
    }

    private function reportPayload(array $overrides = []): array
    {
        return array_merge([
            'report_type' => 'delay',
            'description' => 'The 08:00 metro departed ten minutes late.',
            'latitude' => (float) $this->stopA->latitude,
            'longitude' => (float) $this->stopA->longitude,
            'related_stop_id' => $this->stopA->id,
            // Anchor at yesterday so the time is always in the past no
            // matter when in the day the suite runs (the 08:10 wall-clock
            // time must not leak into "future" territory).
            'occurred_at' => Carbon::yesterday()->setTime(8, 10)->toIso8601String(),
        ], $overrides);
    }

    private function createReport(?User $user = null, array $overrides = []): int
    {
        return $this->actingAs($user ?? $this->user)
            ->postJson('/api/v1/reports', $this->reportPayload($overrides))
            ->assertStatus(201)
            ->json('data.id');
    }

    private function moderate(int $reportId, string $action, ?User $moderator = null, ?string $notes = 'Looks correct.')
    {
        return $this->actingAs($moderator ?? $this->moderator)
            ->postJson("/api/v1/reports/{$reportId}/moderate", [
                'action_taken' => $action,
                'notes' => $notes,
            ]);
    }

    /** @test */
    public function user_can_create_a_report()
    {
        $response = $this->actingAs($this->user)->postJson('/api/v1/reports', $this->reportPayload([
            'media_urls' => ['https://example.com/photo.jpg'],
        ]));

        $response->assertStatus(201);
        $data = $response->json('data');
        $this->assertEquals('pending', $data['status']);
        $this->assertEquals('delay', $data['report_type']);
        $this->assertEquals($this->stopA->id, $data['related_stop_id']);
        $this->assertFalse($data['is_public']);

        $this->assertDatabaseHas('community_reports', [
            'user_id' => $this->user->id,
            'status' => 'pending',
        ]);
    }

    /** @test */
    public function report_creation_is_audited()
    {
        $this->createReport();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->user->id,
            'action' => 'report.created',
            'resource_type' => 'community_report',
        ]);
    }

    /** @test */
    public function report_creation_requires_authentication()
    {
        $this->postJson('/api/v1/reports', $this->reportPayload())->assertStatus(401);
    }

    /** @test */
    public function report_creation_validates_input()
    {
        $this->actingAs($this->user)->postJson('/api/v1/reports', [])->assertStatus(422);

        $this->actingAs($this->user)->postJson('/api/v1/reports', $this->reportPayload([
            'report_type' => 'alien_invasion',
        ]))->assertStatus(422);

        $this->actingAs($this->user)->postJson('/api/v1/reports', $this->reportPayload([
            'latitude' => 91,
        ]))->assertStatus(422);

        $this->actingAs($this->user)->postJson('/api/v1/reports', $this->reportPayload([
            'description' => 'short',
        ]))->assertStatus(422);

        // Future occurrence times are rejected.
        $this->actingAs($this->user)->postJson('/api/v1/reports', $this->reportPayload([
            'occurred_at' => Carbon::today()->addDay()->toIso8601String(),
        ]))->assertStatus(422);

        // Unknown target entities are rejected.
        $this->actingAs($this->user)->postJson('/api/v1/reports', $this->reportPayload([
            'related_stop_id' => 99999,
        ]))->assertStatus(422);

        $this->actingAs($this->user)->postJson('/api/v1/reports', $this->reportPayload([
            'media_urls' => ['a', 'b', 'c', 'd'],
        ]))->assertStatus(422);
    }

    /** @test */
    public function duplicate_reports_within_the_window_are_rejected()
    {
        $this->createReport();

        // Identical report: duplicate.
        $this->actingAs($this->user)
            ->postJson('/api/v1/reports', $this->reportPayload())
            ->assertStatus(409);

        // Same author, different description: allowed.
        $this->actingAs($this->user)
            ->postJson('/api/v1/reports', $this->reportPayload([
                'description' => 'A different issue worth reporting.',
            ]))
            ->assertStatus(201);

        // Same description but a different stop: allowed.
        $this->actingAs($this->user)
            ->postJson('/api/v1/reports', $this->reportPayload([
                'related_stop_id' => $this->stopC->id,
                'latitude' => (float) $this->stopC->latitude,
                'longitude' => (float) $this->stopC->longitude,
            ]))
            ->assertStatus(201);

        // Same content from a different user: allowed.
        $this->createReport($this->otherUser);
    }

    /** @test */
    public function spam_guard_limits_reports_per_hour()
    {
        for ($i = 1; $i <= 5; $i++) {
            $this->createReport(null, ['description' => "Report number $i with enough characters."]);
        }

        $this->actingAs($this->user)
            ->postJson('/api/v1/reports', $this->reportPayload([
                'description' => 'Report number 6 with enough characters.',
            ]))
            ->assertStatus(409);
    }

    /** @test */
    public function moderator_can_verify_a_pending_report()
    {
        $reportId = $this->createReport();

        $response = $this->moderate($reportId, 'verify');

        $response->assertStatus(200);
        $this->assertEquals('verified', $response->json('data.report.status'));
        $this->assertTrue($response->json('data.report.is_public'));
        $this->assertEquals('verify', $response->json('data.moderation.action_taken'));
        $this->assertEquals($this->moderator->id, $response->json('data.moderation.moderator_id'));

        $this->assertDatabaseHas('report_moderations', [
            'community_report_id' => $reportId,
            'moderator_id' => $this->moderator->id,
            'action_taken' => 'verify',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->moderator->id,
            'action' => 'report.verify',
        ]);
    }

    /** @test */
    public function moderator_can_reject_a_pending_report()
    {
        $reportId = $this->createReport();

        $this->moderate($reportId, 'reject', notes: 'Duplicate of an existing report.')->assertStatus(200);

        $this->assertDatabaseHas('community_reports', [
            'id' => $reportId,
            'status' => 'rejected',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'report.reject',
        ]);
    }

    /** @test */
    public function resolve_requires_a_verified_report()
    {
        $reportId = $this->createReport();

        // Resolve directly from pending: conflict.
        $this->moderate($reportId, 'resolve')->assertStatus(409);

        // Verify first, then resolve.
        $this->moderate($reportId, 'verify')->assertStatus(200);
        $this->moderate($reportId, 'resolve')->assertStatus(200);

        $this->assertDatabaseHas('community_reports', [
            'id' => $reportId,
            'status' => 'resolved',
        ]);
    }

    /** @test */
    public function terminal_states_reject_further_moderation()
    {
        $rejectedId = $this->createReport();
        $this->moderate($rejectedId, 'reject')->assertStatus(200);
        $this->moderate($rejectedId, 'verify')->assertStatus(409);
        $this->moderate($rejectedId, 'resolve')->assertStatus(409);

        $resolvedId = $this->createReport(null, ['description' => 'Another verified and resolved issue report.']);
        $this->moderate($resolvedId, 'verify')->assertStatus(200);
        $this->moderate($resolvedId, 'resolve')->assertStatus(200);
        $this->moderate($resolvedId, 'verify')->assertStatus(409);
        $this->moderate($resolvedId, 'reject')->assertStatus(409);
    }

    /** @test */
    public function moderators_cannot_moderate_their_own_reports()
    {
        $reportId = $this->createReport($this->moderator);

        $this->moderate($reportId, 'verify')->assertStatus(409);
    }

    /** @test */
    public function only_moderators_and_admins_can_moderate()
    {
        $reportId = $this->createReport();

        $this->actingAs($this->otherUser)
            ->postJson("/api/v1/reports/{$reportId}/moderate", ['action_taken' => 'verify'])
            ->assertStatus(403);

        $this->actingAs($this->user)
            ->postJson("/api/v1/reports/{$reportId}/moderate", ['action_taken' => 'verify'])
            ->assertStatus(403);

        $this->app['auth']->forgetGuards();

        $this->postJson("/api/v1/reports/{$reportId}/moderate", ['action_taken' => 'verify'])->assertStatus(401);

        $this->moderate($reportId, 'verify', $this->admin)->assertStatus(200);
    }

    /** @test */
    public function moderation_requires_valid_actions()
    {
        $reportId = $this->createReport();

        $this->actingAs($this->moderator)
            ->postJson("/api/v1/reports/{$reportId}/moderate", ['action_taken' => 'ban_user'])
            ->assertStatus(422);
        $this->actingAs($this->moderator)
            ->postJson("/api/v1/reports/{$reportId}/moderate", [])
            ->assertStatus(422);
    }

    /** @test */
    public function public_feed_exposes_only_verified_and_resolved_reports()
    {
        $pendingId = $this->createReport();
        $verifiedId = $this->createReport(null, ['description' => 'A verified cleanliness report for the feed.', 'report_type' => 'cleanliness']);
        $rejectedId = $this->createReport(null, ['description' => 'A rejected safety report for the feed test.', 'report_type' => 'safety']);

        $this->moderate($verifiedId, 'verify')->assertStatus(200);
        $this->moderate($rejectedId, 'reject')->assertStatus(200);

        $feed = $this->getJson('/api/v1/community-reports');
        $feed->assertStatus(200);
        $ids = collect($feed->json('data'))->pluck('id');
        $this->assertContains($verifiedId, $ids);
        $this->assertNotContains($pendingId, $ids);
        $this->assertNotContains($rejectedId, $ids);

        // Public show only exposes approved reports.
        $this->getJson("/api/v1/community-reports/{$verifiedId}")->assertStatus(200);
        $this->getJson("/api/v1/community-reports/{$pendingId}")->assertStatus(404);
        $this->getJson("/api/v1/community-reports/{$rejectedId}")->assertStatus(404);
    }

    /** @test */
    public function trust_score_reflects_verification_outcomes()
    {
        $trustUrl = "/api/v1/users/{$this->user->id}/trust";

        // New author starts neutral.
        $this->actingAs($this->user)->getJson($trustUrl)->assertStatus(200)
            ->assertJsonPath('data.score', 50)
            ->assertJsonPath('data.level', 'standard');

        // Verified: +10.
        $report1 = $this->createReport(null, ['description' => 'First report with sufficient length here.']);
        $this->moderate($report1, 'verify')->assertStatus(200);
        $this->actingAs($this->user)->getJson($trustUrl)->assertJsonPath('data.score', 60);

        // Resolved (was verified first): still counted as a verified contribution.
        $this->moderate($report1, 'resolve')->assertStatus(200);
        $this->actingAs($this->user)->getJson($trustUrl)->assertJsonPath('data.score', 60);

        // Rejected: -15.
        $report2 = $this->createReport(null, ['description' => 'Second report with sufficient length here.', 'related_stop_id' => $this->stopC->id]);
        $this->moderate($report2, 'reject')->assertStatus(200);
        $this->actingAs($this->user)->getJson($trustUrl)->assertJsonPath('data.score', 45);

        // Two more verifications: 45 + 20 = 65 (still standard).
        $report3 = $this->createReport(null, ['description' => 'Third report with sufficient length here.', 'report_type' => 'safety', 'related_stop_id' => null]);
        $this->moderate($report3, 'verify')->assertStatus(200);
        $report4 = $this->createReport(null, ['description' => 'Fourth report with sufficient length here.', 'report_type' => 'suggestion', 'related_stop_id' => $this->stopB->id, 'latitude' => (float) $this->stopB->latitude, 'longitude' => (float) $this->stopB->longitude]);
        $this->moderate($report4, 'verify')->assertStatus(200);
        $this->actingAs($this->user)->getJson($trustUrl)
            ->assertJsonPath('data.score', 65)
            ->assertJsonPath('data.level', 'standard')
            ->assertJsonPath('data.verified_reports', 3)
            ->assertJsonPath('data.rejected_reports', 1);
    }

    /** @test */
    public function trust_levels_reach_trusted_and_low_tiers()
    {
        $service = new \App\Services\Reports\TrustScoreService();
        $this->assertEquals('trusted', $service->level(80));
        $this->assertEquals('standard', $service->level(50));
        $this->assertEquals('low', $service->level(20));
    }

    /** @test */
    public function trust_endpoint_authorization()
    {
        $this->getJson("/api/v1/users/{$this->user->id}/trust")->assertStatus(401);
        $this->actingAs($this->otherUser)->getJson("/api/v1/users/{$this->user->id}/trust")->assertStatus(403);
        $this->actingAs($this->user)->getJson("/api/v1/users/{$this->user->id}/trust")->assertStatus(200);
        $this->actingAs($this->moderator)->getJson("/api/v1/users/{$this->user->id}/trust")->assertStatus(200);
        $this->actingAs($this->admin)->getJson("/api/v1/users/{$this->user->id}/trust")->assertStatus(200);
        $this->actingAs($this->user)->getJson('/api/v1/users/99999/trust')->assertStatus(404);
    }

    /** @test */
    public function report_visibility_is_owner_moderator_or_admin()
    {
        $reportId = $this->createReport();

        $this->actingAs($this->user)->getJson("/api/v1/reports/{$reportId}")->assertStatus(200);
        $this->actingAs($this->moderator)->getJson("/api/v1/reports/{$reportId}")->assertStatus(200);
        $this->actingAs($this->admin)->getJson("/api/v1/reports/{$reportId}")->assertStatus(200);
        $this->actingAs($this->otherUser)->getJson("/api/v1/reports/{$reportId}")->assertStatus(403);

        $this->app['auth']->forgetGuards();

        $this->getJson("/api/v1/reports/{$reportId}")->assertStatus(401);
        $this->actingAs($this->user)->getJson('/api/v1/reports/99999')->assertStatus(404);
    }

    /** @test */
    public function index_lists_own_reports_for_users_and_all_for_moderators()
    {
        $this->createReport(null, ['description' => 'Author one report with enough characters.']);
        $this->createReport($this->otherUser, ['description' => 'Author two report with enough characters.']);

        $mine = $this->actingAs($this->user)->getJson('/api/v1/reports');
        $this->assertCount(1, $mine->json('data'));

        $all = $this->actingAs($this->moderator)->getJson('/api/v1/reports');
        $this->assertCount(2, $all->json('data'));

        // Status filter.
        $this->actingAs($this->moderator)->getJson('/api/v1/reports?status=pending')
            ->assertJsonCount(2, 'data');
    }

    /** @test */
    public function deletion_rules_enforce_ownership_and_status()
    {
        $pendingId = $this->createReport();

        // Another user cannot delete.
        $this->actingAs($this->otherUser)->deleteJson("/api/v1/reports/{$pendingId}")->assertStatus(403);

        // Owner can delete a pending report.
        $this->actingAs($this->user)->deleteJson("/api/v1/reports/{$pendingId}")->assertStatus(200);

        // Owner cannot delete after moderation.
        $verifiedId = $this->createReport(null, ['description' => 'A verified report the author wants gone.']);
        $this->moderate($verifiedId, 'verify')->assertStatus(200);
        $this->actingAs($this->user)->deleteJson("/api/v1/reports/{$verifiedId}")->assertStatus(409);

        // Admin can delete any report.
        $this->actingAs($this->admin)->deleteJson("/api/v1/reports/{$verifiedId}")->assertStatus(200);
    }

    /** @test */
    public function moderation_history_is_persisted_and_ordered()
    {
        $reportId = $this->createReport();
        $this->moderate($reportId, 'verify', notes: 'Confirmed with the operator.');
        $this->moderate($reportId, 'resolve', notes: 'Issue fixed.');

        $response = $this->actingAs($this->user)->getJson("/api/v1/reports/{$reportId}/moderations");
        $response->assertStatus(200);

        $history = $response->json('data');
        $this->assertCount(2, $history);
        $this->assertEquals('verify', $history[0]['action_taken']);
        $this->assertEquals('resolve', $history[1]['action_taken']);
        $this->assertEquals('Confirmed with the operator.', $history[0]['notes']);
        $this->assertEquals($this->moderator->id, $history[0]['moderator_id']);

        // Unauthorized access.
        $this->actingAs($this->otherUser)->getJson("/api/v1/reports/{$reportId}/moderations")->assertStatus(403);
    }

    /** @test */
    public function report_resource_includes_verification_metadata()
    {
        $reportId = $this->createReport();

        $this->moderate($reportId, 'verify', notes: 'Photo matches the description.');

        $data = $this->actingAs($this->moderator)->getJson("/api/v1/reports/{$reportId}")->json('data');
        $this->assertEquals(1, $data['moderation_count']);
        $this->assertTrue($data['is_public']);
        $this->assertEquals('verify', $data['last_moderation']['action_taken']);
        $this->assertEquals('Photo matches the description.', $data['last_moderation']['notes']);
        $this->assertEquals($this->user->id, $data['author']['id']);
        $this->assertEquals(60, $data['author']['trust']['score']);
    }

    /** @test */
    public function audit_trail_covers_the_full_lifecycle()
    {
        $reportId = $this->createReport();
        $this->moderate($reportId, 'verify');
        $this->moderate($reportId, 'resolve');

        $actions = AuditLog::where('resource_type', 'community_report')
            ->where('resource_id', $reportId)
            ->pluck('action')
            ->all();

        $this->assertEquals(['report.created', 'report.verify', 'report.resolve'], $actions);
    }
}
