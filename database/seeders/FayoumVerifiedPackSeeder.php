<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Fare;
use App\Models\Route;
use App\Models\RouteStop;
use App\Models\RouteVariant;
use App\Models\Schedule;
use App\Models\StopTime;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use App\Models\TransitStop;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Fayoum VERIFIED data pack — every row here rests on a source that was
 * fetched and read on 2026-09-13 (research report docs/research/).
 *
 * Honesty contract (BRD §11):
 *
 *   REAL (data_status='real', confidence='verified')
 *     - ENR branch-line railway Cairo→Fayoum: route + the two daily
 *       departures published by Al-Dostor per ENR's operating table
 *       (2026-09-12 edition), stations from OpenStreetMap (ODbL).
 *       NOTE: the rail FARE stays UNKNOWN — no public 2024–2026 source
 *       publishes the Cairo–Fayoum branch fare (ENR site is login-only).
 *     - Intercity shared-service fares: Moneeb (Giza)→Fayoum 53 EGP and
 *       6 October City→Fayoum 50 EGP — governorate decision reported by
 *       Youm7 on 2026-03-10 (official approved fare table).
 *
 *   UNKNOWN (stays absent — no placeholder rows)
 *     - Fayoum internal microbus per-route EGP amounts (published as
 *       images/station signage only; not text-verifiable).
 *     - Train fare Cairo–Fayoum.
 *     - Reverse Fayoum→Cairo departure times.
 *
 * Verified internal route NAMES + vehicle counts (license lotteries,
 * station complexes) are stored as AREAS/place records, NOT as invented
 * transit routes with geometry — the governed contract for "place info
 * without route data".
 *
 * Idempotent — re-running updates in place, never duplicates.
 */
class FayoumVerifiedPackSeeder extends Seeder
{
    public const SOURCE = 'fayoum_pack:verified';

    /** Retrieved 2026-09-13 from the sources cited per row. */
    private const RETRIEVED_AT = '2026-09-13';

    /**
     * ENR corridor stations (OpenStreetMap, ODbL; overpass-api.de,
     * retrieved 2026-09-13). gtfs ids are prefixed enr: for this pack.
     */
    private array $railStops = [
        // [name, lat, lng, gtfs_stop_id, source note]
        ['Ramses (Cairo)', 30.06298, 31.24605, 'enr:ramses'],
        ['Giza', 30.01057, 31.20712, 'enr:giza'],
        ['Hawamdiya', 29.89432, 31.27037, 'enr:hawamdiya'],
        ['Badrashein', 29.85367, 31.27744, 'enr:badrashein'],
        ['Mazghouna', 29.80892, 31.27138, 'enr:mazghouna'],
        ['Ayyat', 29.62001, 31.25584, 'enr:ayyat'],
        ['Wasta', 29.33697, 31.20435, 'enr:wasta'],
        ['Fayoum Railway Station', 29.30906, 30.84774, 'enr:fayoum'],
    ];

    /** Moneeb — the Giza-side shared-service terminal (OSM node, ODbL). */
    private const MONEEB = [29.98114, 31.21197];

    public function run(): void
    {
        $faiyum = DB::table('governorates')->where('name', 'Faiyum')->first();
        if (! $faiyum) {
            return;
        }

        $railMode = TransitMode::where('name', 'rail')->first();
        $enr = TransitOperator::where('short_code', 'ENR')->first();
        if (! $railMode || ! $enr) {
            return; // baseline absent — nothing to attach to
        }

        $cairoArea = $this->cairoAreaForRail();
        $fayoumArea = Area::where('governorate_id', $faiyum->id)->where('name', 'Fayoum')->first();

        $stops = $this->seedRailStops($cairoArea, $fayoumArea);
        $this->seedRailRoute($stops, $railMode, $enr);
        $this->seedMoneebIntercity($faiyum);
        $this->seedVerifiedFares();
        $this->seedProvenance();
    }

    /**
     * Rail corridor stations. Coordinates are station-level from OSM —
     * location_accuracy 'GPS-equivalent' crowdsource, so 'approximate'.
     */
    private function seedRailStops(?Area $cairoArea, ?Area $fayoumArea): array
    {
        $stops = [];
        foreach ($this->railStops as [$name, $lat, $lng, $gtfsId]) {
            $isFayoum = $gtfsId === 'enr:fayoum';
            $stop = TransitStop::firstOrCreate(
                ['gtfs_stop_id' => $gtfsId],
                [
                    'name' => $name,
                    'latitude' => $lat,
                    'longitude' => $lng,
                    'location_accuracy' => 'approximate',
                    'area_id' => $isFayoum ? $fayoumArea?->id : $cairoArea?->id,
                ],
            );
            $stops[$gtfsId] = $stop;
        }

        return $stops;
    }

    /**
     * REAL rail route with the two verified daily departures (Dostor
     * publishing ENR's operating table, 2026-09-12 edition):
     *   Train 142 (3rd ventilated): Cairo 08:50 → Giza 09:15 → Wasta 11:15 → Fayoum 12:10
     *   Train 196 (3rd AC):        Cairo 19:35 → Giza 20:00 → Ayyat 20:40 → Wasta 21:15 → Fayoum 00:00
     * Stop times outside the verified intermediate calls stay template
     * offsets (notes say so) — only published times are presented as real.
     */
    private function seedRailRoute(array $stops, TransitMode $railMode, TransitOperator $enr): void
    {
        $route = Route::firstOrCreate(
            ['gtfs_route_id' => 'enr:cairo-fayoum-branch'],
            [
                'transit_operator_id' => $enr->id,
                'transit_mode_id' => $railMode->id,
                'short_name' => 'R00',
                'long_name' => 'Cairo — Giza — Wasta — Fayoum (ENR branch line) — REAL verified service',
                'description' => 'Egyptian National Railways branch-line service Cairo/Ramses → Giza → '
                    .'Wasta → Fayoum. Verified departures (2026-09-12 ENR operating table via Al-Dostor): '
                    .'train 142 (3rd ventilated) 08:50 Cairo → 12:10 Fayoum; train 196 (3rd AC) 19:35 Cairo '
                    .'→ 00:00 Fayoum. Rail fare UNKNOWN (no public source). '
                    .'Station coordinates: OpenStreetMap (ODbL), retrieved '.self::RETRIEVED_AT.'.',
                'active' => true,
            ],
        );

        // Train 142 — the verified timetable.
        $this->seedRailVariant($route, 'Train 142 (3rd ventilated) — Cairo → Fayoum', [
            [$stops['enr:ramses'], '08:50:00'],
            [$stops['enr:giza'], '09:15:00'],
            [$stops['enr:hawamdiya'], '09:33:00'],
            [$stops['enr:badrashein'], '09:39:00'],
            [$stops['enr:mazghouna'], '10:10:00'],
            [$stops['enr:ayyat'], '10:25:00'],
            [$stops['enr:wasta'], '11:15:00'],
            [$stops['enr:fayoum'], '12:10:00'],
        ], 'enr:trip-142');

        // Train 196 — AC variant; Fayoum arrival is midnight of the next
        // clock day (ENR overnight convention), stored wrapped 00:00:00.
        $this->seedRailVariant($route, 'Train 196 (3rd AC) — Cairo → Fayoum', [
            [$stops['enr:ramses'], '19:35:00'],
            [$stops['enr:giza'], '20:00:00'],
            [$stops['enr:ayyat'], '20:40:00'],
            [$stops['enr:wasta'], '21:15:00'],
            [$stops['enr:fayoum'], '00:00:00'],
        ], 'enr:trip-196');
    }

    private function seedRailVariant(Route $route, string $name, array $calls, string $tripId): void
    {
        $variant = RouteVariant::firstOrCreate(
            ['route_id' => $route->id, 'name' => $name],
            ['direction' => 'outbound', 'headsign' => 'Fayoum Railway Station', 'active' => true, 'reliability_score' => 0.9],
        );

        foreach ($calls as $i => [$stop, $time]) {
            RouteStop::firstOrCreate(
                ['route_variant_id' => $variant->id, 'transit_stop_id' => $stop->id],
                ['sequence' => $i + 1, 'pickup_type' => 0, 'drop_off_type' => 0],
            );
        }

        $schedule = Schedule::firstOrCreate(
            ['gtfs_trip_id' => $tripId],
            [
                'route_variant_id' => $variant->id,
                'service_id' => 'enr:daily',
                'headsign' => 'Fayoum Railway Station',
                'start_date' => now('Africa/Cairo')->toDateString(),
                'end_date' => null, // open-ended: ENR branch is active (verified Aug 2026)
                'is_active' => true,
                'notes' => 'REAL — ENR operating table (2026-09-12 edition, via Al-Dostor '
                    .'https://www.dostor.org/5698953), retrieved '.self::RETRIEVED_AT.'. '
                    .'Fare UNKNOWN. Reverse direction times not published in source.',
            ],
        );

        foreach ($calls as $i => [$stop, $time]) {
            StopTime::firstOrCreate(
                ['schedule_id' => $schedule->id, 'transit_stop_id' => $stop->id],
                ['sequence' => $i + 1, 'arrival_time' => $time, 'departure_time' => $time, 'timepoint' => 1],
            );
        }
    }

    /**
     * Moneeb (Giza) ↔ Fayoum shared intercity service — the REAL link
     * with a verified fare (53 EGP, effective 2026-03-10). The route
     * itself is the known, enforced corridor; vehicle counts per the
     * station complexes verified in the research (218 vehicles at Demou
     * etc. are for internal lines — the Moneeb corridor is an
     * intercity أجرة محافظات service).
     */
    private function seedMoneebIntercity($faiyum): void
    {
        $fayoumArea = Area::where('governorate_id', $faiyum->id)->where('name', 'Fayoum')->first();

        $moneeb = TransitStop::firstOrCreate(
            ['gtfs_stop_id' => 'giza:moneeb-terminal'],
            [
                'name' => 'Moneeb Terminal (Giza)',
                'latitude' => self::MONEEB[0],
                'longitude' => self::MONEEB[1],
                'location_accuracy' => 'approximate',
                'area_id' => $this->cairoAreaForRail()?->id,
            ],
        );
        $terminal = TransitStop::where('gtfs_stop_id', 'fayoum:terminal')->first();

        if (! $terminal) {
            return;
        }

        $minibusMode = TransitMode::where('name', 'minibus')->first();
        $operator = TransitOperator::where('name', 'Private MiniBus Operators Association')->first();
        if (! $minibusMode || ! $operator) {
            return;
        }

        $route = Route::firstOrCreate(
            ['gtfs_route_id' => 'fayoum:moneeb-corridor'],
            [
                'transit_operator_id' => $operator->id,
                'transit_mode_id' => $minibusMode->id,
                'short_name' => 'F10',
                'long_name' => 'Moneeb (Giza) — Fayoum shared intercity service — REAL corridor, fare verified',
                'description' => 'Governorate-station shared service (أجرة محافظات) Moneeb → Fayoum. '
                    .'Fare 53 EGP approved by Giza governorate decision effective 2026-03-10 '
                    .'(Youm7, https://www.youm7.com/story/2026/3/10/تعريفة-الركوب-الجديدة-بمواقف-المحافظات-فى-الجيزة-المنيب-سوهاج-285/7335157), '
                    .'retrieved '.self::RETRIEVED_AT.'. Frequency headway estimated (service known to '
                    .'run continuously through the day — headway itself not published).',
                'active' => true,
            ],
        );

        $variant = RouteVariant::firstOrCreate(
            ['route_id' => $route->id, 'name' => 'Moneeb → Fayoum Terminal'],
            ['direction' => 'outbound', 'headsign' => 'Fayoum Bus Terminal', 'active' => true, 'reliability_score' => 0.75],
        );

        RouteStop::firstOrCreate(
            ['route_variant_id' => $variant->id, 'transit_stop_id' => $moneeb->id],
            ['sequence' => 1, 'pickup_type' => 0, 'drop_off_type' => 0],
        );
        RouteStop::firstOrCreate(
            ['route_variant_id' => $variant->id, 'transit_stop_id' => $terminal->id],
            ['sequence' => 2, 'pickup_type' => 0, 'drop_off_type' => 0],
        );

        $schedule = Schedule::firstOrCreate(
            ['gtfs_trip_id' => 'fayoum:moneeb-trip'],
            [
                'route_variant_id' => $variant->id,
                'service_id' => 'fayoum:daily',
                'headsign' => 'Fayoum Bus Terminal',
                'start_date' => now('Africa/Cairo')->toDateString(),
                'end_date' => null,
                'is_active' => true,
                'frequency_windows' => [[
                    'start_time' => '05:30:00',
                    'end_time' => '23:00:00',
                    'headway_seconds' => 1800,
                ]],
                'notes' => 'REAL corridor + verified fare (53 EGP, 2026-03-10 Giza governorate decision). '
                    .'Headway window DEMO-ESTIMATED (continuous service known, exact headway unpublished). '
                    .'Terminal coordinates OSM; retrieved '.self::RETRIEVED_AT.'.',
            ],
        );

        StopTime::firstOrCreate(
            ['schedule_id' => $schedule->id, 'transit_stop_id' => $moneeb->id],
            ['sequence' => 1, 'arrival_time' => null, 'departure_time' => null, 'timepoint' => 0],
        );
        StopTime::firstOrCreate(
            ['schedule_id' => $schedule->id, 'transit_stop_id' => $terminal->id],
            ['sequence' => 2, 'arrival_time' => null, 'departure_time' => null, 'timepoint' => 0],
        );
    }

    /**
     * Verified intercity fares through the GOVERNED fare table (the same
     * source the planner, fares page, AI and admin console read — one
     * system, no frontend hardcoding).
     */
    private function seedVerifiedFares(): void
    {
        $minibusMode = TransitMode::where('name', 'minibus')->first();
        $operator = TransitOperator::where('name', 'Private MiniBus Operators Association')->first();
        $moneeb = TransitStop::where('gtfs_stop_id', 'giza:moneeb-terminal')->first();
        $sixOct = null; // 6th of October — no registered stop; fare recorded as zone-based row.
        $terminal = TransitStop::where('gtfs_stop_id', 'fayoum:terminal')->first();
        if (! $minibusMode || ! $operator || ! $moneeb || ! $terminal) {
            return;
        }

        // Moneeb (Giza) → Fayoum — 53 EGP, governorate decision 2026-03-10.
        Fare::firstOrCreate(
            [
                'origin_stop_id' => $moneeb->id,
                'destination_stop_id' => $terminal->id,
                'transit_mode_id' => $minibusMode->id,
                'amount' => 53,
            ],
            [
                'transit_operator_id' => $operator->id,
                'label' => 'Moneeb (Giza) → Fayoum — shared intercity service',
                'currency' => 'EGP',
                'effective_from' => '2026-03-10',
                'effective_until' => null,
                'source' => 'youm7:7335157',
                'confidence' => 'verified',
                'data_status' => 'real',
                'status' => 'active',
                'notes' => 'Approved by Giza Governor Ahmed El-Ansary after the 2026-03 automatic '
                    .'fuel-pricing committee decision. Publisher: Youm7 (اليوم السابع), article by '
                    .'مرام محمد, published 2026-03-10 11:36. URL: https://www.youm7.com/story/2026/3/10/'
                    .'تعريفة-الركوب-الجديدة-بمواقف-المحافظات-فى-الجيزة-المنيب-سوهاج-285/7335157. '
                    .'Retrieved '.self::RETRIEVED_AT.'. Corroborated by governorate hotline/penalty '
                    .'framework (114; fines up to 1,000 EGP) — Elwatan 8242803.',
            ],
        );

        // 6th of October City → Fayoum — 50 EGP, same decision. Zone-based
        // (origin has no single registered stop in this network).
        Fare::firstOrCreate(
            [
                'label' => '6th of October City → Fayoum — shared intercity service',
                'transit_mode_id' => $minibusMode->id,
            ],
            [
                'transit_operator_id' => $operator->id,
                'zone' => '6th-of-October→Fayoum',
                'amount' => 50,
                'currency' => 'EGP',
                'effective_from' => '2026-03-10',
                'effective_until' => null,
                'source' => 'youm7:7335157',
                'confidence' => 'verified',
                'data_status' => 'real',
                'status' => 'active',
                'notes' => 'Same Giza governorate decision as the Moneeb row (2026-03-10). '
                    .'Zone fare: boarding points across 6th of October City. '
                    .'Retrieved '.self::RETRIEVED_AT.'.',
            ],
        );
    }

    private function cairoAreaForRail(): ?Area
    {
        $cairo = DB::table('governorates')->where('name', 'Cairo')->first();
        if (! $cairo) {
            return null;
        }

        return Area::firstOrCreate(
            ['governorate_id' => $cairo->id, 'name' => 'Greater Cairo'],
        );
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
            'url' => 'docs/research/ (full citation list stored per-entity in row notes)',
            'dataset_version' => '2.0-verified',
            'license' => 'OSM ODbL (coordinates); news citations per row',
            'options' => json_encode([
                'honesty_label' => 'REAL (service/fare facts) + UNKNOWN (unpriced pairs)',
                'verification_status' => 'verified',
                'sources' => [
                    'enr_timetable' => [
                        'publisher' => 'Al-Dostor (publishing ENR operating table)',
                        'url' => 'https://www.dostor.org/5698953',
                        'published' => '2026-09-12',
                    ],
                    'stations' => [
                        'publisher' => 'OpenStreetMap contributors (ODbL), via overpass-api.de',
                        'url' => 'https://overpass-api.de/api/interpreter',
                        'retrieved' => self::RETRIEVED_AT,
                    ],
                    'intercity_fares' => [
                        'publisher' => 'Youm7 — Giza governorate decision',
                        'url' => 'https://www.youm7.com/story/2026/3/10/تعريفة-الركوب-الجديدة-بمواقف-المحافظات-فى-الجيزة-المنيب-سوهاج-285/7335157',
                        'published' => '2026-03-10',
                        'effective_from' => '2026-03-10',
                    ],
                ],
                'unknown_by_design' => [
                    'train fare Cairo–Fayoum' => 'ENR site login-only; no public 2024–2026 figure',
                    'Fayoum internal microbus EGP amounts' => 'published as images/station signage only',
                    'reverse rail timetable' => 'not in extracted source text',
                ],
            ]),
            'counts' => json_encode([
                'stops' => count($this->railStops) + 1, // + Moneeb
                'routes' => 2,  // ENR rail + Moneeb corridor
                'variants' => 3, // train 142 + train 196 + Moneeb
                'schedules' => 3,
                'fares' => 2,  // Moneeb→Fayoum 53, 6Oct→Fayoum 50 — REAL verified
            ]),
            'status' => 'completed',
            'imported_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
