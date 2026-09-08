<?php

namespace Tests\Feature\Admin;

use App\Models\CommunityReport;
use App\Models\Notification;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Feature\Journey\CreatesJourneyNetwork;

class AnalyticsTest extends TestCase
{
    use RefreshDatabase;
    use CreatesJourneyNetwork;

    private User $admin;
    private User $user;
    private User $moderator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createJourneyNetwork();
        $this->admin = User::factory()->create();
        $this->admin->roles()->create(['name' => 'admin', 'description' => 'Administrator']);
        $this->user = User::factory()->create();
        $this->moderator = User::factory()->create();
        $this->moderator->roles()->create(['name' => 'moderator', 'description' => 'Moderator']);
    }

    /* ---------------------------- helpers ---------------------------- */

    private function saveJourney(?User $user = null): int
    {
        $origin = $this->nearStop($this->stopA);
        $destination = $this->nearStop($this->stopC);

        return $this->actingAs($user ?? $this->user)
            ->postJson('/api/v1/journeys', [
                'origin_lat' => $origin['lat'],
                'origin_lng' => $origin['lng'],
                'destination_lat' => $destination['lat'],
                'destination_lng' => $destination['lng'],
                'requested_at' => Carbon::today()->setTime(7, 30)->toIso8601String(),
            ])
            ->assertStatus(201)
            ->json('data.id');
    }

    private function startAndRide(?User $user = null): int
    {
        $journeyId = $this->saveJourney($user);

        return $this->actingAs($user ?? $this->user)
            ->postJson("/api/v1/journeys/{$journeyId}/start", [
                'started_at' => Carbon::today()->setTime(7, 30)->toIso8601String(),
            ])
            ->assertStatus(201)
            ->json('data.id');
    }

    private function createReport(?User $user = null, array $overrides = []): int
    {
        $payload = array_merge([
            'report_type' => 'delay',
            'description' => 'Report '.uniqid().' with a sufficiently long description.',
            'latitude' => (float) $this->stopA->latitude,
            'longitude' => (float) $this->stopA->longitude,
            'related_stop_id' => $this->stopA->id,
        ], $overrides);

        return $this->actingAs($user ?? $this->user)
            ->postJson('/api/v1/reports', $payload)
            ->assertStatus(201)
            ->json('data.id');
    }

    private function moderate(int $reportId, string $action)
    {
        return $this->actingAs($this->moderator)
            ->postJson("/api/v1/reports/{$reportId}/moderate", [
                'action_taken' => $action,
                'notes' => 'Analytics fixture.',
            ]);
    }

    /* ------------------------- authorization ------------------------- */

    /** @test */
    public function analytics_require_authentication()
    {
        foreach (['dashboard', 'journeys', 'deviations', 'usage', 'reports', 'trust', 'notifications', 'modes'] as $endpoint) {
            $this->getJson("/api/v1/admin/analytics/{$endpoint}")->assertStatus(401);
        }
    }

    /** @test */
    public function analytics_reject_non_admins()
    {
        foreach (['dashboard', 'journeys', 'usage', 'modes'] as $endpoint) {
            $this->actingAs($this->user)->getJson("/api/v1/admin/analytics/{$endpoint}")->assertStatus(403);
        }
    }

    /** @test */
    public function admin_can_access_all_analytics_endpoints()
    {
        foreach (['dashboard', 'journeys', 'deviations', 'usage', 'reports', 'trust', 'notifications', 'modes'] as $endpoint) {
            $this->actingAs($this->admin)
                ->getJson("/api/v1/admin/analytics/{$endpoint}")
                ->assertStatus(200)
                ->assertJsonPath('success', true);
        }
    }

    /** @test */
    public function date_filters_are_validated()
    {
        $this->actingAs($this->admin)
            ->getJson('/api/v1/admin/analytics/journeys?from=2026-01-10&to=2026-01-01')
            ->assertStatus(422);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/admin/analytics/journeys?from=not-a-date')
            ->assertStatus(422);
    }

    /* ------------------------- empty database ------------------------ */

    /** @test */
    public function empty_data_returns_zeroed_metrics()
    {
        $dashboard = $this->actingAs($this->admin)->getJson('/api/v1/admin/analytics/dashboard')->json('data');

        $this->assertEquals(3, $dashboard['totals']['users']); // admin + user + moderator
        $this->assertEquals(0, $dashboard['totals']['journeys_created']);
        $this->assertEquals(0, $dashboard['totals']['journey_searches']);
        $this->assertEquals(0, $dashboard['totals']['deviations']);
        $this->assertEquals(0.0, $dashboard['journey_completion_rate']);
        $this->assertEquals(0.0, $dashboard['report_approval_rate']);

        $journeys = $this->actingAs($this->admin)->getJson('/api/v1/admin/analytics/journeys')->json('data');
        $this->assertEquals(0, $journeys['totals']['created']);
        $this->assertEquals(0.0, $journeys['completion_rate']);
        $this->assertEquals(0.0, $journeys['avg_planned_duration_sec']);
        $this->assertEquals([], $journeys['created_per_day']);

        $modes = $this->actingAs($this->admin)->getJson('/api/v1/admin/analytics/modes')->json('data');
        $this->assertEquals([], $modes['modes']);
    }

    /* --------------------------- journeys ---------------------------- */

    /** @test */
    public function journey_metrics_report_completion_and_cancellation_rates()
    {
        // 4 journeys, one at a time (one active journey per user):
        // 2 completed, 1 cancelled, 1 still in flight.
        $first = $this->startAndRide();
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$first}/complete")->assertStatus(200);

        $second = $this->startAndRide();
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$second}/complete")->assertStatus(200);

        $third = $this->startAndRide();
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$third}/cancel")->assertStatus(200);

        $this->startAndRide(); // in flight

        $data = $this->actingAs($this->admin)->getJson('/api/v1/admin/analytics/journeys')->json('data');

        $this->assertEquals(4, $data['totals']['created']);
        $this->assertEquals(2, $data['totals']['completed']);
        $this->assertEquals(1, $data['totals']['cancelled']);
        $this->assertEquals(1, $data['totals']['active_journeys']);
        $this->assertEquals(66.67, $data['completion_rate']);
        $this->assertEquals(33.33, $data['cancellation_rate']);
        $this->assertGreaterThan(0, $data['avg_planned_duration_sec']);
        $this->assertCount(1, $data['created_per_day']); // all created today
    }

    /* ------------------------ deviations/recovery -------------------- */

    /** @test */
    public function deviation_metrics_count_types_severities_and_recovery()
    {
        $this->startAndRide();
        // Board, then deviate: 1 medium off_route event.
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/".\App\Models\ActiveJourney::latest('id')->first()->id."/location", [
            'latitude' => (float) $this->stopA->latitude,
            'longitude' => (float) $this->stopA->longitude,
            'recorded_at' => Carbon::today()->setTime(7, 31)->toIso8601String(),
        ])->assertStatus(200);
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/".\App\Models\ActiveJourney::latest('id')->first()->id."/location", [
            'latitude' => 30.0585,
            'longitude' => 31.2420,
            'recorded_at' => Carbon::today()->setTime(7, 50)->toIso8601String(),
        ])->assertStatus(200);

        $activeId = \App\Models\ActiveJourney::latest('id')->first()->id;
        $this->actingAs($this->user)->postJson("/api/v1/active-journeys/{$activeId}/recovery-options", [])->assertStatus(200);

        $data = $this->actingAs($this->admin)->getJson('/api/v1/admin/analytics/deviations')->json('data');

        $this->assertEquals(1, $data['totals']['deviations']);
        $this->assertEquals(1, $data['by_type']['off_route']);
        $this->assertEquals(1, $data['by_severity']['medium']);
        $this->assertGreaterThanOrEqual(1, $data['totals']['recovery_options_generated']);
        $this->assertEquals(0, $data['totals']['recovery_options_accepted']);
        $this->assertEquals(0.0, $data['recovery_acceptance_rate']);
    }

    /* ----------------------------- usage ----------------------------- */

    /** @test */
    public function usage_metrics_track_searches_and_saved_journeys()
    {
        $this->saveJourney();
        $this->saveJourney();

        $data = $this->actingAs($this->admin)->getJson('/api/v1/admin/analytics/usage')->json('data');

        // Each save runs one search (re-plan) and records both events.
        $this->assertEquals(2, $data['totals']['journey_searches']);
        $this->assertEquals(2, $data['totals']['journeys_saved']);
        $this->assertEquals(100.0, $data['search_to_saved_conversion_rate']);
    }

    /* ----------------------------- reports --------------------------- */

    /** @test */
    public function report_metrics_cover_statuses_types_and_moderation()
    {
        $r1 = $this->createReport();
        $r2 = $this->createReport(null, ['report_type' => 'cleanliness', 'description' => 'Cleanliness issue '.uniqid().' at the stop.']);
        $r3 = $this->createReport(null, ['report_type' => 'safety', 'description' => 'Safety concern '.uniqid().' near the platform.']);

        $this->moderate($r1, 'verify')->assertStatus(200);
        $this->moderate($r2, 'reject')->assertStatus(200);
        $this->moderate($r3, 'verify')->assertStatus(200);
        $this->moderate($r3, 'resolve')->assertStatus(200);

        $data = $this->actingAs($this->admin)->getJson('/api/v1/admin/analytics/reports')->json('data');

        $this->assertEquals(3, $data['totals']['reports']);
        $this->assertEquals(1, $data['by_status']['verified']);
        $this->assertEquals(1, $data['by_status']['rejected']);
        $this->assertEquals(1, $data['by_status']['resolved']);
        $this->assertEquals(1, $data['by_type']['delay']);
        $this->assertEquals(1, $data['by_type']['cleanliness']);
        $this->assertEquals(1, $data['by_type']['safety']);
        // Approved = verified + resolved = 2 of 3.
        $this->assertEquals(66.67, $data['approval_rate']);
        $this->assertEquals(4, $data['totals']['moderation_actions']);
        $this->assertEquals(1, $data['totals']['active_moderators']);
        $this->assertEquals(1.33, $data['avg_moderations_per_moderated_report']); // 4 actions across 3 moderated reports
    }

    /* ------------------------------ trust ---------------------------- */

    /** @test */
    public function trust_metrics_aggregate_scores_and_levels()
    {
        $r1 = $this->createReport();
        $this->moderate($r1, 'verify')->assertStatus(200);
        $r2 = $this->createReport(null, ['description' => 'Second report '.uniqid().' with enough length.']);
        $this->moderate($r2, 'verify')->assertStatus(200);
        $r3 = $this->createReport(null, ['description' => 'Third report '.uniqid().' with enough length.']);
        $this->moderate($r3, 'verify')->assertStatus(200);
        $r4 = $this->createReport(null, ['description' => 'Fourth report '.uniqid().' with enough length.']);
        $this->moderate($r4, 'reject')->assertStatus(200);

        // Author: 50 + 3*10 - 15 = 65 (standard). Admin + moderator: 50 each.
        $data = $this->actingAs($this->admin)->getJson('/api/v1/admin/analytics/trust')->json('data');

        $this->assertEquals(3, $data['users']);
        $this->assertEquals(55.0, $data['average_score']); // (65+50+50)/3
        $this->assertEquals(0, $data['by_level']['trusted']);
        $this->assertEquals(3, $data['by_level']['standard']);
        $this->assertEquals(0, $data['by_level']['low']);
    }

    /* -------------------------- notifications ------------------------ */

    /** @test */
    public function notification_metrics_track_volume_and_read_rate()
    {
        // Starting a journey sends one notification to the owner.
        $this->startAndRide();

        $service = new NotificationService();
        $n1 = $service->send($this->user->id, 'journey_started');
        $service->send($this->user->id, 'journey_deviation', ['deviation_type' => 'off_route', 'severity' => 'medium']);
        $service->markRead($n1);

        $data = $this->actingAs($this->admin)->getJson('/api/v1/admin/analytics/notifications')->json('data');

        $this->assertEquals(3, $data['totals']['notifications']);
        $this->assertEquals(1, $data['totals']['read']);
        $this->assertEquals(2, $data['totals']['unread']);
        $this->assertEquals(1, $data['totals']['elevated_priority']); // the deviation notification (high)
        $this->assertEquals(33.33, $data['read_rate']);
        $this->assertArrayHasKey('journey_started', $data['by_type']);
    }

    /* ------------------------------ modes ---------------------------- */

    /** @test */
    public function mode_usage_counts_legs_by_transit_mode()
    {
        $this->saveJourney(); // walk + metro + walk

        $data = $this->actingAs($this->admin)->getJson('/api/v1/admin/analytics/modes')->json('data');
        $modes = collect($data['modes'])->pluck('legs', 'mode')->toArray();

        $this->assertEquals(2, $modes['walking']);
        $this->assertEquals(1, $modes['metro']);

        $metro = collect($data['modes'])->firstWhere('mode', 'metro');
        $this->assertEquals(1, $metro['journeys']);
        $this->assertGreaterThan(0, $metro['total_distance_meters']);
    }

    /* --------------------------- date filters ------------------------ */

    /** @test */
    public function date_filters_narrow_the_metrics()
    {
        $this->saveJourney();
        $reportId = $this->createReport();

        // Backdate everything 10 days.
        CommunityReport::query()->update(['created_at' => Carbon::today()->subDays(10)]);
        \DB::table('journeys')->update(['created_at' => Carbon::today()->subDays(10)]);
        \DB::table('analytics_events')->update(['occurred_at' => Carbon::today()->subDays(10)]);

        // A range covering only "yesterday" sees nothing.
        $from = Carbon::today()->subDays(2)->toDateString();
        $to = Carbon::yesterday()->toDateString();

        $journeys = $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/analytics/journeys?from={$from}&to={$to}")
            ->json('data');
        $this->assertEquals(0, $journeys['totals']['created']);

        $reports = $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/analytics/reports?from={$from}&to={$to}")
            ->json('data');
        $this->assertEquals(0, $reports['totals']['reports']);

        // A range covering the backdated data sees everything.
        $from = Carbon::today()->subDays(11)->toDateString();
        $to = Carbon::today()->toDateString();

        $journeys = $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/analytics/journeys?from={$from}&to={$to}")
            ->json('data');
        $this->assertEquals(1, $journeys['totals']['created']);

        $reports = $this->actingAs($this->admin)
            ->getJson("/api/v1/admin/analytics/reports?from={$from}&to={$to}")
            ->json('data');
        $this->assertEquals(1, $reports['totals']['reports']);
    }

    /* ---------------------------- dashboard -------------------------- */

    /** @test */
    public function dashboard_aggregates_the_cross_module_totals()
    {
        $this->saveJourney();
        $this->startAndRide();
        $reportId = $this->createReport();

        $data = $this->actingAs($this->admin)->getJson('/api/v1/admin/analytics/dashboard')->json('data');

        $this->assertEquals(3, $data['totals']['users']);
        $this->assertEquals(2, $data['totals']['journeys_created']);
        $this->assertGreaterThanOrEqual(2, $data['totals']['journey_searches']);
        $this->assertEquals(1, $data['totals']['active_journeys_in_flight']);
        $this->assertEquals(1, $data['totals']['community_reports']);
        $this->assertEquals(1, $data['totals']['pending_reports']);
        $this->assertGreaterThanOrEqual(1, $data['totals']['notifications_sent']); // journey started
        $this->assertArrayHasKey('journey_completion_rate', $data);
        $this->assertArrayHasKey('average_user_trust_score', $data);
    }
}
