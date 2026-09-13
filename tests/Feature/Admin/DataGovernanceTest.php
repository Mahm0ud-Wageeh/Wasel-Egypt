<?php

namespace Tests\Feature\Admin;

use App\Models\AuditLog;
use App\Models\Route;
use App\Models\Schedule;
use App\Models\StopTime;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use App\Models\TransitStop;
use App\Models\User;
use App\Services\Transit\GtfsImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use ZipArchive;

/**
 * Admin data-governance console: import history with provenance, live
 * data-quality indicators, audit history, and the authorized rollback
 * flow (preview → confirm → execute → audit event). Rollback deletes
 * exactly the import's stamped subtree and never touches other sources.
 */
class DataGovernanceTest extends TestCase
{
    use RefreshDatabase;

    private string $zipPath;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = \App\Models\Role::create(['name' => 'admin', 'description' => 'Admin']);
        $this->admin = User::factory()->create(['email' => 'gov-admin@test.com']);
        $this->admin->roles()->attach($adminRole->id);

        // Seed a baseline row that rollback must never touch.
        TransitStop::factory()->create(['gtfs_stop_id' => 'BASELINE_STOP']);

        $this->zipPath = $this->buildTestFeed();
    }

    protected function tearDown(): void
    {
        if (file_exists($this->zipPath)) {
            unlink($this->zipPath);
        }
        parent::tearDown();
    }

    private function importFeed(string $sourceName): array
    {
        $service = app(GtfsImportService::class);

        return $service->importFeed($this->zipPath, [
            'agency_mode_map' => ['BUS_CO' => 'bus'],
            'source' => [
                'name' => $sourceName,
                'url' => 'https://example.test/feed.zip',
                'version' => 'test-1',
                'license' => 'CC-BY-NC-SA-2.0',
            ],
        ]);
    }

    /** @test */
    public function imports_history_lists_provenance_counts_and_rollbackability()
    {
        $this->importFeed('gov:fixture');

        $res = $this->actingAs($this->admin)->getJson('/api/v1/admin/data/imports');

        $res->assertOk();
        $row = collect($res->json('data'))->firstWhere('source', 'gov:fixture');
        $this->assertNotNull($row);
        $this->assertSame('completed', $row['status']);
        $this->assertSame('CC-BY-NC-SA-2.0', $row['license']);
        $this->assertTrue($row['rollbackable']);
        $this->assertArrayHasKey('counts', $row);
        $this->assertGreaterThan(0, $row['counts']['stops_created']);
        $this->assertSame('passed', $row['validation']['status']);
    }

    /** @test */
    public function quality_dashboard_reports_real_counts_only()
    {
        $this->importFeed('gov:fixture');

        $res = $this->actingAs($this->admin)->getJson('/api/v1/admin/data/quality');

        $res->assertOk();
        $q = $res->json('data');
        $this->assertEquals(TransitStop::count(), $q['stops']['total']);
        $this->assertEquals(Route::count(), $q['routes']['total']);
        $this->assertArrayHasKey('unknown_pairs_note', $q['fares']);
        $this->assertGreaterThanOrEqual(0, $q['summary']['critical_issues']);
        $this->assertGreaterThanOrEqual(0, $q['geometry']['variants_without_geometry']);
        // Indicator added for the release dashboard.
        $this->assertArrayHasKey('suspicious_length', $q['geometry']);
    }

    /** @test */
    public function audit_history_returns_recorded_admin_actions()
    {
        AuditLog::create([
            'user_id' => $this->admin->id,
            'action' => 'import.rollback',
            'resource_type' => 'data_import_log',
            'resource_id' => 7,
            'changes' => ['deleted' => ['routes' => 1]],
            'occurred_at' => now(),
        ]);

        $res = $this->actingAs($this->admin)->getJson('/api/v1/admin/data/audit?action=import');

        $res->assertOk();
        $rows = collect($res->json('data'));
        $this->assertSame(1, $rows->count());
        $this->assertSame('gov-admin@test.com', $rows->first()['user']['email']);
        $this->assertSame('import.rollback', $rows->first()['action']);
    }

    /** @test */
    public function rollback_preview_lists_exact_affected_counts_and_warnings()
    {
        $this->importFeed('gov:fixture');
        $logId = DB::table('data_import_logs')->where('source', 'gov:fixture')->value('id');

        $res = $this->actingAs($this->admin)->getJson("/api/v1/admin/data/imports/{$logId}/rollback-preview");

        $res->assertOk();
        $preview = $res->json('data');
        $this->assertGreaterThan(0, $preview['affected']['transit_stops']);
        $this->assertGreaterThan(0, $preview['affected']['routes']);
        $this->assertGreaterThan(0, $preview['affected']['schedules']);
        $this->assertFalse($preview['reversible']);
        $this->assertNotEmpty($preview['warnings']);
    }

    /** @test */
    public function rollback_requires_confirmation_and_is_audited()
    {
        $this->importFeed('gov:fixture');
        $logId = DB::table('data_import_logs')->where('source', 'gov:fixture')->value('id');

        $stopsBefore = TransitStop::count();
        $routesBefore = Route::count();

        // Without confirm → validation error.
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/data/imports/{$logId}/rollback", [])
            ->assertStatus(422);

        // With confirm → executes, deletes exactly the stamped subtree.
        $res = $this->actingAs($this->admin)->postJson(
            "/api/v1/admin/data/imports/{$logId}/rollback",
            ['confirm' => true, 'reason' => 'test rollback'],
        );
        $res->assertOk();

        $deleted = $res->json('data.deleted');
        $this->assertGreaterThan(0, $deleted['transit_stops']);

        // Baseline row survives.
        $this->assertSame($stopsBefore - $deleted['transit_stops'], TransitStop::count());
        $this->assertSame($routesBefore - ($deleted['routes'] ?? 0), Route::count());
        $this->assertDatabaseHas('transit_stops', ['gtfs_stop_id' => 'BASELINE_STOP']);

        // The import log itself survives as an audit record.
        $this->assertDatabaseHas('data_import_logs', ['id' => $logId]);

        // Audit event recorded with actor and reason.
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->admin->id,
            'action' => 'import.rollback',
            'resource_type' => 'data_import_log',
            'resource_id' => $logId,
        ]);
        $audit = AuditLog::where('action', 'import.rollback')->first();
        $this->assertSame('test rollback', $audit->changes['context']['reason']);
    }

    /** @test */
    public function rollback_is_refused_for_imports_without_stamped_rows()
    {
        $logId = DB::table('data_import_logs')->insertGetId([
            'source' => 'legacy:unstamped',
            'status' => 'completed',
            'imported_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Baseline (1 stop) untouched by the refusal.
        $this->actingAs($this->admin)
            ->postJson("/api/v1/admin/data/imports/{$logId}/rollback", ['confirm' => true])
            ->assertStatus(409);

        $this->assertSame(1, TransitStop::count()); // baseline untouched
    }

    /** @test */
    public function governance_endpoints_require_admin_role()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/admin/data/imports')->assertStatus(403);
        $this->actingAs($user)->getJson('/api/v1/admin/data/quality')->assertStatus(403);
        $this->actingAs($user)->getJson('/api/v1/admin/data/audit')->assertStatus(403);
        $this->actingAs($this->admin)->getJson('/api/v1/admin/data/imports')->assertOk();
    }

    /**
     * Small GTFS zip: 1 agency, 2 stops, 1 route, 1 trip, 2 stop times, 1 shape.
     */
    private function buildTestFeed(): string
    {
        $dir = storage_path('app/gtfs-sources/test-feed');
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        $zipPath = $dir.'/governance-fixture.zip';

        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('agency.txt', "agency_id,agency_name\nBUS_CO,Governance Bus\n");
        $zip->addFromString('stops.txt', "stop_id,stop_name,stop_lat,stop_lon\nS1,Gov Terminal,30.0500,31.2300\nS2,Gov Mid,30.0550,31.2350\n");
        $zip->addFromString('routes.txt', "route_id,agency_id,route_short_name,route_long_name\nR1,BUS_CO,1,Gov Line\n");
        $zip->addFromString('trips.txt', "route_id,service_id,trip_id,direction_id\nR1,SVC1,T1,0\n");
        $zip->addFromString('stop_times.txt', "trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT1,08:00:00,08:00:00,S1,1\nT1,08:10:00,08:10:00,S2,2\n");
        $zip->addFromString('shapes.txt', "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\nSH1,30.0500,31.2300,1\nSH1,30.0550,31.2350,2\n");
        $zip->addFromString('frequencies.txt', "trip_id,start_time,end_time,headway_secs\nT1,06:00:00,22:00:00,900\n");
        $zip->close();

        return $zipPath;
    }
}
