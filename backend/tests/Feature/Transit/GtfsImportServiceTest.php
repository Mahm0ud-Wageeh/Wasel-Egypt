<?php

namespace Tests\Feature\Transit;

use App\Models\Area;
use App\Models\Governorate;
use App\Models\Route;
use App\Models\RouteGeometry;
use App\Models\RouteVariant;
use App\Models\Schedule;
use App\Models\StopTime;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use App\Models\TransitStop;
use App\Services\Transit\GtfsImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use ZipArchive;

/**
 * Verifies the streaming GTFS importer against a small synthetic feed that
 * exercises the hard parts of real feeds: multiple agencies, frequency-based
 * service, agency-specific mode mapping, shape geometry and calendar dates.
 */
class GtfsImportServiceTest extends TestCase
{
    use RefreshDatabase;

    private string $zipPath;

    protected function setUp(): void
    {
        parent::setUp();
        $this->zipPath = $this->buildTestFeed();
    }

    protected function tearDown(): void
    {
        if (file_exists($this->zipPath)) {
            unlink($this->zipPath);
        }
        parent::tearDown();
    }

    /** @test */
    public function validation_rejects_feeds_missing_required_files()
    {
        $service = app(GtfsImportService::class);

        $emptyZip = storage_path('app/gtfs-sources/test-empty.zip');
        $zip = new ZipArchive();
        $zip->open($emptyZip, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('agency.txt', "agency_id,agency_name\nX,Test");
        $zip->close();

        $result = $service->validateFeed($emptyZip);
        $this->assertFalse($result['valid']);
        $this->assertStringContainsString('Missing required file', $result['errors'][0]);

        unlink($emptyZip);
    }

    /** @test */
    public function import_maps_agencies_operators_and_frequency_schedules()
    {
        $service = app(GtfsImportService::class);
        $result = $service->importFeed($this->zipPath, [
            'agency_mode_map' => ['BUS_CO' => 'bus', 'VAN_CO' => 'microbus'],
            'service_start' => '2026-09-01',
            'service_end' => '2027-09-01',
            'source' => [
                'name' => 'test:fixture',
                'url' => 'https://example.test/feed.zip',
                'version' => 'test-1',
                'license' => 'CC-BY-NC-SA-2.0',
            ],
        ]);

        $this->assertSame(2, $result['transit_operators_created']);
        $this->assertSame(4, $result['stops_created']);
        $this->assertSame(2, $result['routes_created']);
        $this->assertSame(2, $result['route_variants_created']);
        $this->assertSame(2, $result['schedules_created']);
        $this->assertSame(4, $result['frequency_windows_created']);
        $this->assertSame(4, $result['stop_times_created']);
        $this->assertSame(2, $result['route_geometries_created']);

        // Modes mapped via agency_id, not route_type (the T4C convention).
        $bus = TransitOperator::where('short_code', 'BUS_CO')->firstOrFail();
        $van = TransitOperator::where('short_code', 'VAN_CO')->firstOrFail();
        $this->assertSame('Cairo Bus Company', $bus->name);
        $this->assertSame('Microbus Collective', $van->name);

        $busRoute = Route::where('gtfs_route_id', 'R_BUS')->firstOrFail();
        $vanRoute = Route::where('gtfs_route_id', 'R_VAN')->firstOrFail();
        $this->assertSame('bus', $busRoute->transitMode->name);
        $this->assertSame('microbus', $vanRoute->transitMode->name);
        $this->assertSame($bus->id, $busRoute->transit_operator_id);
        $this->assertSame($van->id, $vanRoute->transit_operator_id);

        // Frequency windows stored on the schedule.
        $busSchedule = Schedule::where('gtfs_trip_id', 'T_BUS_1')->firstOrFail();
        $windows = $busSchedule->frequency_windows;
        $this->assertIsArray($windows);
        $this->assertCount(2, $windows);
        $this->assertSame('06:00:00', $windows[0]['start_time']);
        $this->assertSame(900, $windows[0]['headway_secs']);

        // Stop times imported with normalized times (2 rows for the bus trip).
        $this->assertSame(2, StopTime::where('schedule_id', $busSchedule->id)->count());

        // Service window normalized to the demo dates.
        $this->assertSame('2026-09-01', $busSchedule->start_date->toDateString());
        $this->assertSame('2027-09-01', $busSchedule->end_date->toDateString());

        // Geometry attached per variant (not all points on one variant).
        $busVariant = $busSchedule->route_variant_id;
        $geometry = RouteGeometry::where('route_variant_id', $busVariant)->firstOrFail();
        $this->assertCount(3, $geometry->geometry);

        // Provenance logged.
        $this->assertDatabaseHas('data_import_logs', [
            'source' => 'test:fixture',
            'license' => 'CC-BY-NC-SA-2.0',
        ]);
    }

    /** @test */
    public function re_import_is_idempotent()
    {
        $service = app(GtfsImportService::class);
        $options = [
            'agency_mode_map' => ['BUS_CO' => 'bus', 'VAN_CO' => 'microbus'],
            'service_start' => '2026-09-01',
            'service_end' => '2027-09-01',
            'source' => ['name' => 'test:fixture'],
        ];

        $service->importFeed($this->zipPath, $options);

        $beforeStops = TransitStop::count();
        $beforeRoutes = Route::count();
        $beforeVariants = RouteVariant::count();
        $beforeSchedules = Schedule::count();
        $beforeStopTimes = StopTime::count();
        $beforeGeometries = RouteGeometry::count();

        $second = $service->importFeed($this->zipPath, $options);

        $this->assertSame(0, $second['stops_created']);
        $this->assertSame(0, $second['routes_created']);
        $this->assertSame(0, $second['route_variants_created']);

        $this->assertSame($beforeStops, TransitStop::count());
        $this->assertSame($beforeRoutes, Route::count());
        $this->assertSame($beforeVariants, RouteVariant::count());
        $this->assertSame($beforeSchedules, Schedule::count());
        $this->assertSame($beforeGeometries, RouteGeometry::count());
        // stop_times use insertOrIgnore on (schedule_id, sequence) — no dupes.
        $this->assertSame($beforeStopTimes, StopTime::count());
    }

    /** @test */
    public function overnight_gtfs_times_are_normalized_for_storage()
    {
        $service = app(GtfsImportService::class);
        $result = $service->importFeed($this->zipPath, [
            'agency_mode_map' => ['BUS_CO' => 'bus', 'VAN_CO' => 'microbus'],
            'source' => ['name' => 'test:fixture'],
        ]);

        $this->assertGreaterThan(0, $result['stop_times_created']);

        // The fixture contains a 24:30:00 overnight departure; it must be
        // stored wrapped (00:30:00) rather than crashing on TIME overflow.
        $vanSchedule = Schedule::where('gtfs_trip_id', 'T_VAN_1')->firstOrFail();
        $wrapped = StopTime::where('schedule_id', $vanSchedule->id)
            ->where('departure_time', '00:30:00')
            ->exists();
        $this->assertTrue($wrapped, 'Overnight 24:30:00 must normalize to 00:30:00');
    }

    /**
     * Build a small GTFS zip exercising agencies, frequencies, shapes and
     * an overnight time.
     */
    private function buildTestFeed(): string
    {
        $dir = storage_path('app/gtfs-sources/test-feed');
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $files = [
            'agency.txt' => "agency_id,agency_name,agency_url,agency_timezone\n"
                . "BUS_CO,Cairo Bus Company,https://bus.test,Africa/Cairo\n"
                . "VAN_CO,Microbus Collective,https://van.test,Africa/Cairo\n",
            'stops.txt' => "stop_id,stop_name,stop_lat,stop_lon\n"
                . "S1,Downtown Terminal,30.0500,31.2300\n"
                . "S2,Mid City,30.0550,31.2350\n"
                . "S3,North Plaza,30.0600,31.2400\n"
                . "S4,Riverside,30.0650,31.2450\n",
            'routes.txt' => "route_id,agency_id,route_short_name,route_long_name,route_type\n"
                . "R_BUS,BUS_CO,10,Downtown - Riverside,1\n"
                . "R_VAN,VAN_CO,V1,Terminal - Riverside,0\n",
            'trips.txt' => "route_id,service_id,trip_id,direction_id,shape_id\n"
                . "R_BUS,SVC_DAILY,T_BUS_1,0,SH_BUS\n"
                . "R_VAN,SVC_DAILY,T_VAN_1,0,SH_VAN\n",
            'stop_times.txt' => "trip_id,arrival_time,departure_time,stop_id,stop_sequence\n"
                . "T_BUS_1,06:00:00,06:00:00,S1,1\n"
                . "T_BUS_1,06:10:00,06:10:00,S2,2\n"
                . "T_VAN_1,24:30:00,24:30:00,S1,1\n"   // overnight
                . "T_VAN_1,24:40:00,24:40:00,S3,2\n",
            'frequencies.txt' => "trip_id,start_time,end_time,headway_secs\n"
                . "T_BUS_1,06:00:00,12:00:00,900\n"
                . "T_BUS_1,12:00:00,23:00:00,1800\n"
                . "T_VAN_1,06:00:00,14:00:00,600\n"
                . "T_VAN_1,14:00:00,23:00:00,1200\n",
            'calendar.txt' => "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n"
                . "SVC_DAILY,1,1,1,1,1,1,1,20250101,20251231\n",
            'shapes.txt' => "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\n"
                . "SH_BUS,30.0500,31.2300,1\n"
                . "SH_BUS,30.0550,31.2350,2\n"
                . "SH_BUS,30.0600,31.2400,3\n"
                . "SH_VAN,30.0500,31.2300,1\n"
                . "SH_VAN,30.0600,31.2400,2\n",
        ];

        foreach ($files as $name => $content) {
            file_put_contents("{$dir}/{$name}", $content);
        }

        $zipPath = storage_path('app/gtfs-sources/test-feed.zip');
        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        foreach (array_keys($files) as $name) {
            $zip->addFile("{$dir}/{$name}", $name);
        }
        $zip->close();

        return $zipPath;
    }
}
