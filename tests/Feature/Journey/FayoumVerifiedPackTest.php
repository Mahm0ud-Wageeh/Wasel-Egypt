<?php

namespace Tests\Feature\Journey;

use App\Models\Fare;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Fayoum VERIFIED pack honesty contract: the seeded ENR rail service and
 * the Moneeb intercity corridor must exist as REAL data with full source
 * metadata, the verified fares must flow through the same governed fare
 * table the planner/fares-page/AI/admin read, and everything still
 * unverified must remain honestly UNKNOWN (absent).
 */
class FayoumVerifiedPackTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class); // full baseline incl. both Fayoum packs
    }

    /** @test */
    public function enr_rail_service_is_seeded_as_real_with_verified_timetable()
    {
        $route = \App\Models\Route::where('gtfs_route_id', 'enr:cairo-fayoum-branch')->firstOrFail();

        $this->assertSame('Egyptian National Railways', $route->transitOperator->name);
        $this->assertSame('rail', $route->transitMode->name);
        $this->assertStringContainsString('REAL', $route->long_name);

        // Train 142 verified times: Cairo 08:50 → Fayoum 12:10.
        $schedule142 = \App\Models\Schedule::where('gtfs_trip_id', 'enr:trip-142')->firstOrFail();
        $first = \App\Models\StopTime::where('schedule_id', $schedule142->id)->orderBy('sequence')->first();
        $last = \App\Models\StopTime::where('schedule_id', $schedule142->id)->orderByDesc('sequence')->first();
        $this->assertSame('08:50:00', $first->departure_time);
        $this->assertSame('12:10:00', $last->arrival_time);

        // Wasta call at 11:15 — the branch point that proves the real route.
        $wasta = \App\Models\TransitStop::where('gtfs_stop_id', 'enr:wasta')->firstOrFail();
        $wastaCall = \App\Models\StopTime::where('schedule_id', $schedule142->id)
            ->where('transit_stop_id', $wasta->id)->first();
        $this->assertSame('11:15:00', $wastaCall->departure_time);

        // Schedule notes carry the source citation.
        $this->assertStringContainsString('dostor.org/5698953', $schedule142->notes);
    }

    /** @test */
    public function verified_intercity_fares_flow_through_the_governed_fare_table()
    {
        // REAL rows with full provenance.
        $moneeb = Fare::where('source', 'youm7:7335157')
            ->where('amount', 53)->where('data_status', 'real')->firstOrFail();
        $this->assertSame('verified', $moneeb->confidence);
        $this->assertSame('2026-03-10', $moneeb->effective_from->toDateString());
        $this->assertStringContainsString('youm7.com', $moneeb->notes);

        // The public fares endpoint surfaces them like any governed row.
        $res = $this->getJson('/api/v1/fares');
        $res->assertOk();
        $labels = collect($res->json('data'))->pluck('label');
        $this->assertTrue($labels->contains('Moneeb (Giza) → Fayoum — shared intercity service'));

        // Same source the admin console reads — one governed system.
        $adminRole = \App\Models\Role::where('name', 'admin')->firstOrFail();
        $admin = \App\Models\User::factory()->create();
        $admin->roles()->attach($adminRole->id);
        $adminRes = $this->actingAs($admin)->getJson('/api/v1/admin/fares?search=Moneeb');
        $adminRes->assertOk();
        $this->assertTrue(collect($adminRes->json('data'))->pluck('label')
            ->contains('Moneeb (Giza) → Fayoum — shared intercity service'));
    }

    /** @test */
    public function the_planner_connects_fayoum_to_giza_over_the_real_network()
    {
        $user = \App\Models\User::factory()->create();
        $terminal = \App\Models\TransitStop::where('gtfs_stop_id', 'fayoum:terminal')->firstOrFail();
        $giza = \App\Models\TransitStop::where('name', 'Giza')->firstOrFail();

        $res = $this->actingAs($user)->postJson('/api/v1/journeys/search', [
            'origin_lat' => $terminal->latitude,
            'origin_lng' => $terminal->longitude,
            'destination_lat' => $giza->latitude,
            'destination_lng' => $giza->longitude,
        ]);

        $res->assertOk();
        $options = collect($res->json('data.options') ?? $res->json('options') ?? []);
        $this->assertGreaterThan(0, $options->count(), 'planner must connect Fayoum into the one network');
    }

    /** @test */
    public function unknown_fares_stay_absent_and_the_public_api_says_so_honestly()
    {
        // No rail fare row may exist (train Cairo–Fayoum unpriced).
        $railMode = \App\Models\TransitMode::where('name', 'rail')->first();
        $this->assertSame(0, Fare::where('transit_mode_id', $railMode->id)->count());

        // Pair estimate for rail ends → no verified pair fare.
        $ramses = \App\Models\TransitStop::where('gtfs_stop_id', 'enr:ramses')->firstOrFail();
        $fayoumRail = \App\Models\TransitStop::where('gtfs_stop_id', 'enr:fayoum')->firstOrFail();
        $res = $this->getJson("/api/v1/fares/estimate?origin={$ramses->id}&destination={$fayoumRail->id}");
        $res->assertOk();
        $this->assertNull($res->json('data'));
        $this->assertSame('no_verified_pair_fare', $res->json('meta.reason'));
    }

    /** @test */
    public function provenance_log_records_sources_and_unknown_by_design()
    {
        $log = DB::table('data_import_logs')->where('source', 'fayoum_pack:verified')->first();
        $this->assertNotNull($log);

        $options = json_decode((string) $log->options, true);
        $this->assertSame('verified', $options['verification_status']);
        $this->assertArrayHasKey('enr_timetable', $options['sources']);
        $this->assertArrayHasKey('unknown_by_design', $options);
        $this->assertArrayHasKey('train fare Cairo–Fayoum', $options['unknown_by_design']);

        $counts = json_decode((string) $log->counts, true);
        $this->assertSame(2, $counts['fares']); // exactly the two verified rows
    }
}
