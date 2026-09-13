<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\RouteVariant;
use App\Models\Schedule;
use App\Models\StopTime;
use App\Models\TransitStop;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Fayoum Transport Pack — governed expansion of the ONE network into Fayoum
 * governorate so the SAME multimodal planner can serve Fayoum ↔ Giza/Cairo
 * and Fayoum city trips. Honesty contract (BRD §11):
 *
 *   REAL              — administrative geography: the Faiyum governorate,
 *                       its markaz areas, and town coordinates (city-level
 *                       precision, location_accuracy='approximate').
 *   DEMO-ESTIMATED    — the corridor/city ROUTES and service windows below
 *                       are placeholder scaffolding labeled at the data layer
 *                       (source='fayoum_pack:demo', notes on every schedule).
 *   UNKNOWN           — FAYOUM FARES: no published fare schedule has been
 *                       verified in this repository, so NO fare rows are
 *                       seeded (absent = unknown = honest). Admins add them
 *                       via the governed fares console with source + effective
 *                       date the moment a verified source exists. The same
 *                       applies to any service not listed here.
 *
 * Provenance: one data_import_logs row records source, version, license
 * stance, counts, and the demo label. Idempotent — re-running updates in
 * place and never duplicates.
 */
class FayoumTransportPackSeeder extends Seeder
{
    public const SOURCE = 'fayoum_pack:demo';

    /** Real administrative geography (markaz centers, city-level coordinates). */
    private array $areas = [
        'Fayoum' => [29.3084, 30.8415],
        'Tamiya' => [29.4725, 30.9662],
        'Sinnuris' => [29.4254, 30.9307],
        'Ibsheway' => [29.3760, 30.8930],
        'Itsa' => [29.2900, 30.8070],
        'Youssef El-Seddik' => [29.2440, 30.8900],
        'Abshway' => [29.3450, 30.9350],
        'New Fayoum' => [29.2740, 30.8930],
    ];

    /** Demo stops keyed by gtfs_stop_id. Coordinates are town-level. */
    private array $stops = [
        'fayoum:terminal' => ['Fayoum Bus Terminal', 29.3084, 30.8415, 'Fayoum'],
        'fayoum:university' => ['Fayoum University', 29.3180, 30.8470, 'Fayoum'],
        'fayoum:tamiya' => ['Tamiya', 29.4725, 30.9662, 'Tamiya'],
        'fayoum:sinnuris' => ['Sinnuris', 29.4254, 30.9307, 'Sinnuris'],
        'fayoum:ibsheway' => ['Ibsheway', 29.3760, 30.8930, 'Ibsheway'],
        'fayoum:itsa' => ['Itsa', 29.2900, 30.8070, 'Itsa'],
        'fayoum:new-city' => ['New Fayoum City', 29.2740, 30.8930, 'New Fayoum'],
    ];

    public function run(): void
    {
        $faiyum = DB::table('governorates')->where('name', 'Faiyum')->first();
        if (! $faiyum) {
            return; // governorate baseline absent — nothing to attach to
        }

        $areas = $this->seedAreas((int) $faiyum->id);
        $stops = $this->seedStops($areas);
        $giza = $this->gizaAnchorStop();

        $this->seedCorridorRoute($stops, $giza);
        $this->seedCityRoute($stops);
        $this->seedProvenance();
    }

    /** REAL: Faiyum markaz areas (firstOrCreate by governorate + name). */
    private function seedAreas(int $governorateId): array
    {
        $areas = [];
        foreach ($this->areas as $name => [$lat, $lng]) {
            $area = Area::firstOrCreate(
                ['governorate_id' => $governorateId, 'name' => $name],
            );
            $areas[$name] = $area;
        }

        return $areas;
    }

    /** REAL geography, DEMO pack membership: approximate town-level stops. */
    private function seedStops(array $areas): array
    {
        $stops = [];
        foreach ($this->stops as $gtfsId => [$name, $lat, $lng, $areaName]) {
            $stop = TransitStop::firstOrCreate(
                ['gtfs_stop_id' => $gtfsId],
                [
                    'name' => $name,
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'location_accuracy' => 'approximate',
                    'area_id' => $areas[$areaName]?->id,
                ],
            );
            $stops[$gtfsId] = $stop;
        }

        return $stops;
    }

    /**
     * Cross-governorate anchor: attach the corridor to the EXISTING Greater
     * Cairo "Giza" stop so Fayoum rides connect into the same metro/bus graph
     * (one network — no separate planner).
     */
    private function gizaAnchorStop(): TransitStop
    {
        $exact = TransitStop::where('name', 'Giza')->first();
        if ($exact) {
            return $exact;
        }

        $like = TransitStop::where('name', 'like', '%Giza%')
            ->whereNotNull('gtfs_stop_id')
            ->orderBy('id')
            ->first();
        if ($like) {
            return $like;
        }

        return TransitStop::firstOrCreate(
            ['gtfs_stop_id' => 'fayoum:giza-gate'],
            [
                'name' => 'Giza (Fayoum corridor gate)',
                'latitude' => 30.0130,
                'longitude' => 31.2115,
                'location_accuracy' => 'approximate',
            ],
        );
    }

    /** DEMO-ESTIMATED intercity corridor: Fayoum Terminal → Tamiya → Giza. */
    private function seedCorridorRoute(array $stops, TransitStop $giza): void
    {
        $route = Route::firstOrCreate(
            ['gtfs_route_id' => 'fayoum:demo-corridor'],
            [
                'transit_operator_id' => 4, // Private MiniBus Operators Association
                'transit_mode_id' => 3,     // minibus
                'short_name' => 'F01',
                'long_name' => 'Fayoum ↔ Giza corridor — DEMO-ESTIMATED (unverified service)',
                'description' => 'DEMO-ESTIMATED corridor placeholder (fayoum_pack:demo). '
                    .'Replace with a verified published service when available.',
                'active' => true,
            ],
        );

        $variant = RouteVariant::firstOrCreate(
            ['route_id' => $route->id, 'name' => 'Fayoum Terminal → '.$giza->name],
            ['direction' => 'outbound', 'headsign' => $giza->name, 'active' => true, 'reliability_score' => 0.6],
        );

        $sequence = [
            [$stops['fayoum:terminal'], '00:00:00', '00:00:00'],
            [$stops['fayoum:tamiya'], '00:25:00', '00:25:00'],
            [$giza, '01:30:00', '01:30:00'],
        ];

        $this->seedVariantSkeleton($variant, $sequence);
    }

    /** DEMO-ESTIMATED city service: Terminal → University → New Fayoum. */
    private function seedCityRoute(array $stops): void
    {
        $route = Route::firstOrCreate(
            ['gtfs_route_id' => 'fayoum:demo-city'],
            [
                'transit_operator_id' => 4,
                'transit_mode_id' => 4, // microbus
                'short_name' => 'F02',
                'long_name' => 'Fayoum city internal service — DEMO-ESTIMATED (unverified service)',
                'description' => 'DEMO-ESTIMATED internal service placeholder (fayoum_pack:demo).',
                'active' => true,
            ],
        );

        $variant = RouteVariant::firstOrCreate(
            ['route_id' => $route->id, 'name' => 'Fayoum Terminal → University → New Fayoum City'],
            ['direction' => 'loop', 'headsign' => 'New Fayoum City', 'active' => true, 'reliability_score' => 0.6],
        );

        $sequence = [
            [$stops['fayoum:terminal'], '00:00:00', '00:00:00'],
            [$stops['fayoum:university'], '00:10:00', '00:10:00'],
            [$stops['fayoum:new-city'], '00:25:00', '00:25:00'],
        ];

        $this->seedVariantSkeleton($variant, $sequence);
    }

    /** Shared variant wiring: route stops + frequency schedule + template stop times. */
    private function seedVariantSkeleton(RouteVariant $variant, array $sequence): void
    {
        foreach ($sequence as $i => [$stop, $arr, $dep]) {
            RouteStop::firstOrCreate(
                ['route_variant_id' => $variant->id, 'transit_stop_id' => $stop->id],
                ['sequence' => $i + 1, 'pickup_type' => 0, 'drop_off_type' => 0],
            );
        }

        $window = [[
            'start_time' => '05:00:00',
            'end_time' => '22:00:00',
            'headway_seconds' => 1800,
        ]];

        $schedule = Schedule::firstOrCreate(
            [
                'route_variant_id' => $variant->id,
                'gtfs_trip_id' => 'fayoum:demo-trip:'.$variant->id,
            ],
            [
                'service_id' => 'fayoum:demo-service',
                'headsign' => $variant->headsign,
                'start_date' => now('Africa/Cairo')->toDateString(),
                'end_date' => now('Africa/Cairo')->addYear()->toDateString(),
                'is_active' => true,
                'frequency_windows' => $window,
                'notes' => 'DEMO-ESTIMATED service window (fayoum_pack:demo) — never labeled live.',
            ],
        );

        foreach ($sequence as $i => [$stop, $arr, $dep]) {
            StopTime::firstOrCreate(
                [
                    'schedule_id' => $schedule->id,
                    'transit_stop_id' => $stop->id,
                ],
                [
                    'sequence' => $i + 1,
                    'arrival_time' => $arr,
                    'departure_time' => $dep,
                ],
            );
        }
    }

    /** Provenance row for the governed import pipeline. */
    private function seedProvenance(): void
    {
        $exists = DB::table('data_import_logs')
            ->where('source', self::SOURCE)
            ->exists();
        if ($exists) {
            return;
        }

        DB::table('data_import_logs')->insert([
            'source' => self::SOURCE,
            'url' => null,
            'dataset_version' => '1.0-demo',
            'license' => 'n/a — DEMO-ESTIMATED placeholders (no verified external source yet)',
            'options' => json_encode([
                'honesty_label' => 'DEMO-ESTIMATED',
                'verification_status' => 'unverified',
                'real_components' => 'governorate/markaz areas + town-level coordinates',
                'note' => 'Routes, service windows and fares are scaffolding; replace via admin console with verified sources.',
            ]),
            'counts' => json_encode([
                'areas' => count($this->areas),
                'stops' => count($this->stops),
                'routes' => 2,
                'variants' => 2,
                'schedules' => 2,
                'fares' => 0, // UNKNOWN — honest absence until a verified source exists
            ]),
            'status' => 'completed',
            'imported_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
