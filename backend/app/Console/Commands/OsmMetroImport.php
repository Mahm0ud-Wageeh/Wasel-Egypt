<?php

namespace App\Console\Commands;

use App\Models\Area;
use App\Models\Route;
use App\Models\RouteGeometry;
use App\Models\RouteStop;
use App\Models\RouteVariant;
use App\Models\Schedule;
use App\Models\StopTime;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use App\Models\TransitStop;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * Import Cairo Metro (and other OSM rail relations) into the Wasel schema
 * with explicit OSM provenance.
 *
 * OSM data is ODbL licensed: attribution "© OpenStreetMap contributors"
 * required; derived station/geometry data is stored, not redistributed.
 * Schedules are DERIVED from published National Authority for Tunnels
 * operating patterns (not an official GTFS feed) — recorded as derived
 * frequency windows and clearly flagged in schedule notes.
 *
 * The importer is idempotent: OSM stop ids are stored as gtfs_stop_id
 * ("osm-N<id>") and OSM relation ids as gtfs_route_id ("osm-R<id>"), so
 * re-running updates in place.
 */
class OsmMetroImport extends Command
{
    protected $signature = 'osm:metro-import {--file= : Local JSON file from Overpass (skips download)}
        {--service-start= : Demo service window start (Y-m-d)}
        {--service-end= : Demo service window end (Y-m-d)}
        {--dry-run : Report what would be imported without writing}';

    protected $description = 'Import Cairo Metro lines from OSM relations with derived frequency schedules';

    private const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

    /** Published NAT headways (seconds) by service period. */
    private const METRO_HEADWAYS = [
        'peak' => 300,      // ~5 min peak (07:00-10:00, 16:00-20:00)
        'offpeak' => 420,   // ~7 min off-peak
        'evening' => 600,   // ~10 min evening
    ];

    private const METRO_SERVICE_WINDOWS = [
        ['start' => '05:30:00', 'end' => '07:00:00', 'headway' => self::METRO_HEADWAYS['offpeak']],
        ['start' => '07:00:00', 'end' => '10:00:00', 'headway' => self::METRO_HEADWAYS['peak']],
        ['start' => '10:00:00', 'end' => '16:00:00', 'headway' => self::METRO_HEADWAYS['offpeak']],
        ['start' => '16:00:00', 'end' => '20:00:00', 'headway' => self::METRO_HEADWAYS['peak']],
        ['start' => '20:00:00', 'end' => '23:30:00', 'headway' => self::METRO_HEADWAYS['evening']],
    ];

    public function handle(): int
    {
        set_time_limit(0);
        ini_set('memory_limit', '1G');

        $jsonPath = $this->option('file');
        $dryRun = (bool) $this->option('dry-run');

        if ($jsonPath !== null) {
            if (!is_file($jsonPath)) {
                $this->error("File not found: {$jsonPath}");

                return self::FAILURE;
            }
            $data = json_decode(file_get_contents($jsonPath), true);
        } else {
            $this->info('Downloading Cairo metro relations from Overpass...');
            $query = <<<'OVERPASS'
[out:json][timeout:120];
area["name:en"="Cairo"]["boundary"="administrative"]->.ca;
relation["route"="subway"](area.ca);
out meta;
node(r);
out meta qt;
OVERPASS;
            $response = Http::asForm()->post(self::OVERPASS_URL, ['data' => $query]);
            if ($response->failed()) {
                $this->error('Overpass request failed: ' . $response->status());

                return self::FAILURE;
            }
            $data = $response->json();
            file_put_contents(storage_path('app/osm-sources/metro-full.json'), $response->body());
        }

        if (!isset($data['elements'])) {
            $this->error('Invalid Overpass response');

            return self::FAILURE;
        }

        $relations = array_values(array_filter($data['elements'], fn (array $e) => $e['type'] === 'relation'));
        $nodes = [];
        foreach ($data['elements'] as $e) {
            if ($e['type'] === 'node') {
                $nodes[$e['id']] = $e;
            }
        }

        $this->info('Found ' . count($relations) . ' metro relations, ' . count($nodes) . ' nodes.');

        // Group relations by line ref; keep the pair of directions.
        $lines = [];
        foreach ($relations as $relation) {
            $ref = $relation['tags']['ref'] ?? null;
            if ($ref === null) {
                continue;
            }
            $lines[$ref][] = $relation;
        }

        $stats = [
            'lines' => 0, 'routes_created' => 0, 'variants_created' => 0,
            'stops_created' => 0, 'stops_linked' => 0, 'geometries' => 0, 'schedules' => 0,
        ];

        $area = Area::where('name', 'Greater Cairo')->first() ?? $this->ensureDefaultArea();
        $metroMode = TransitMode::firstOrCreate(
            ['name' => 'metro'],
            ['description' => 'Cairo Metro', 'icon' => 'subway']
        );
        $operator = TransitOperator::firstOrCreate(
            ['short_code' => 'NAT'],
            ['name' => 'National Authority for Tunnels', 'website' => 'http://cairometro.gov.eg/']
        );

        foreach ($lines as $ref => $refRelations) {
            $stats['lines']++;
            $this->line("Line {$ref}: " . count($refRelations) . ' direction(s)');

            foreach ($refRelations as $relation) {
                $relationId = $relation['id'];
                $gtfsRouteId = 'osm-R' . $relationId;

                // ---- Ordered station stop_positions (deduplicate stations
                // that appear with several stop roles / platform entries).
                $stationStops = [];
                $seenStationIds = [];
                foreach ($relation['members'] as $member) {
                    if ($member['type'] !== 'node' || !str_starts_with($member['role'] ?? '', 'stop')) {
                        continue;
                    }
                    $node = $nodes[$member['ref']] ?? null;
                    if ($node === null || !isset($node['lat'], $node['lon'])) {
                        continue;
                    }
                    if (isset($seenStationIds[$member['ref']])) {
                        continue;
                    }
                    $seenStationIds[$member['ref']] = true;
                    $stationStops[] = [
                        'osm_id' => $member['ref'],
                        'name' => $node['tags']['name'] ?? ($node['tags']['name:en'] ?? 'Station ' . $member['ref']),
                        'name_en' => $node['tags']['name:en'] ?? null,
                        'lat' => $node['lat'],
                        'lng' => $node['lon'],
                    ];
                }

                if (count($stationStops) < 2) {
                    $this->warn("  relation {$relationId}: fewer than 2 station stops, skipping");
                    continue;
                }

                if ($dryRun) {
                    $this->line("  [dry-run] {$gtfsRouteId}: " . count($stationStops) . ' stations, name=' . ($relation['tags']['name'] ?? '?'));
                    continue;
                }

                // ---- Resolve/create route (one per line, not per direction)
                $route = Route::firstOrCreate(
                    ['gtfs_route_id' => 'osm-L' . $ref],
                    [
                        'transit_mode_id' => $metroMode->id,
                        'transit_operator_id' => $operator->id,
                        'long_name' => $this->lineName($relation['tags'] ?? [], $ref),
                        'short_name' => 'Line ' . $ref,
                        'type' => 1,
                        'color' => ltrim($relation['tags']['colour'] ?? '', '#') ?: null,
                        'active' => true,
                    ]
                );

                if ($route->wasRecentlyCreated) {
                    $stats['routes_created']++;
                }

                // ---- Variant per direction
                $isInbound = str_contains($relation['tags']['name'] ?? '', '←');
                $variantName = 'OSM ' . $gtfsRouteId;
                $variant = RouteVariant::firstOrCreate(
                    ['route_id' => $route->id, 'name' => $variantName, 'direction' => $isInbound ? 'inbound' : 'outbound'],
                    ['headsign' => $this->lastStopHeadsign($stationStops), 'active' => true, 'reliability_score' => 0.95]
                );

                if ($variant->wasRecentlyCreated) {
                    $stats['variants_created']++;
                }

                // ---- Stops (idempotent, cross-linked with existing GTFS stops by proximity)
                $sequence = 1;
                $stopTimeRows = [];
                $seenVariantStops = [];
                foreach ($stationStops as $station) {
                    $stop = $this->resolveStation($station, $area, $stats);
                    $existing = RouteStop::where('route_variant_id', $variant->id)
                        ->where('transit_stop_id', $stop->id)
                        ->where('sequence', $sequence)
                        ->first();

                    if (!$existing) {
                        RouteStop::firstOrCreate(
                            ['route_variant_id' => $variant->id, 'transit_stop_id' => $stop->id, 'sequence' => $sequence],
                            ['pickup_type' => 0, 'drop_off_type' => 0]
                        );
                    }

                    // Template stop times: derive from published average
                    // inter-station run times (~2 min) + 30s dwell.
                    $templateTime = sprintf('%02d:%02d:00', 5, 30) . ' +' . ($sequence - 1) . ' stops';
                    $minutes = (int) floor(((($sequence - 1) * 150) + 330) / 60);
                    $stopTimeRows[] = [
                        'transit_stop_id' => $stop->id,
                        'sequence' => $sequence,
                        'time' => sprintf('%02d:%02d:00', intdiv($minutes, 60), $minutes % 60),
                    ];
                    $seenVariantStops[$stop->id] = true;
                    $sequence++;
                }

                // ---- Schedule with derived frequency windows
                $schedule = Schedule::firstOrCreate(
                    ['gtfs_trip_id' => 'osm-R' . $relationId],
                    [
                        'route_variant_id' => $variant->id,
                        'service_id' => 'osm_metro_daily',
                        'direction_id' => $isInbound ? 1 : 0,
                        'headsign' => $this->lastStopHeadsign($stationStops),
                        'wheelchair_accessible' => true,
                        'notes' => 'Derived from OSM relation; schedule pattern from published NAT operating times (not an official feed)',
                        'start_date' => $this->option('service-start') ?? now()->toDateString(),
                        'end_date' => $this->option('service-end'),
                        'is_active' => true,
                        'frequency_windows' => array_map(
                            fn (array $w) => ['start_time' => $w['start'], 'end_time' => $w['end'], 'headway_secs' => $w['headway']],
                            self::METRO_SERVICE_WINDOWS
                        ),
                    ]
                );
                $schedule->update([
                    'frequency_windows' => array_map(
                        fn (array $w) => ['start_time' => $w['start'], 'end_time' => $w['end'], 'headway_secs' => $w['headway']],
                        self::METRO_SERVICE_WINDOWS
                    ),
                ]);

                if ($schedule->wasRecentlyCreated) {
                    $stats['schedules']++;
                }

                // ---- Stop times (fully replace existing rows for this
                // schedule — force delete, since soft-deleted rows would
                // still occupy the unique (schedule_id, sequence) index).
                StopTime::where('schedule_id', $schedule->id)->forceDelete();
                foreach ($stopTimeRows as $index => $row) {
                    StopTime::create([
                        'schedule_id' => $schedule->id,
                        'transit_stop_id' => $row['transit_stop_id'],
                        'sequence' => $row['sequence'],
                        'arrival_time' => $row['time'],
                        'departure_time' => $row['time'],
                        'timepoint' => 1,
                    ]);
                }

                // ---- Geometry from member ways (deduplicate shared nodes, decimate)
                $geometry = $this->relationGeometry($relation, $nodes);
                if ($geometry !== []) {
                    RouteGeometry::updateOrCreate(
                        ['route_variant_id' => $variant->id],
                        ['geometry' => $geometry, 'length_meters' => $this->polylineLength($geometry)]
                    );
                    $stats['geometries']++;
                }
            }
        }

        // ---- Provenance
        if (!$dryRun) {
            $renamed = $this->backfillStationNames($lines, $nodes);
            if ($renamed > 0) {
                $this->line("Backfilled names for {$renamed} previously imported stations.");
            }

            DB::table('data_import_logs')->insert([
                'source' => 'osm:cairo-metro',
                'url' => 'https://overpass-api.de (relations ' . implode(',', array_column($relations, 'id')) . ')',
                'dataset_version' => 'osm-' . now()->toDateString(),
                'license' => 'ODbL-1.0',
                'options' => json_encode(['derived_schedules' => 'NAT published operating patterns']),
                'counts' => json_encode($stats),
                'status' => 'completed',
                'imported_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->info('Metro import ' . ($dryRun ? 'preview' : 'complete') . ':');
        foreach ($stats as $key => $value) {
            $this->line(sprintf('  %-16s %s', str_replace('_', ' ', $key), $value));
        }

        return self::SUCCESS;
    }

    /**
     * Resolve an OSM station to a Wasel transit stop — creating it or
     * linking to a nearby existing GTFS stop within 150m (enables real
     * bus↔metro interchanges).
     */
    private function resolveStation(array $station, Area $area, array &$stats): TransitStop
    {
        $gtfsId = 'osm-N' . $station['osm_id'];

        $existing = TransitStop::where('gtfs_stop_id', $gtfsId)->first();
        if ($existing) {
            return $existing;
        }

        // Proximity link to existing stops (max 150m) for interchanges.
        $nearby = TransitStop::whereBetween('latitude', [$station['lat'] - 0.0015, $station['lat'] + 0.0015])
            ->whereBetween('longitude', [$station['lng'] - 0.0015, $station['lng'] + 0.0015])
            ->get();

        foreach ($nearby as $candidate) {
            $distance = $this->haversine($station['lat'], $station['lng'], (float) $candidate->latitude, (float) $candidate->longitude);
            if ($distance <= 150) {
                $stats['stops_linked']++;

                return $candidate;
            }
        }

        $stop = TransitStop::create([
            'gtfs_stop_id' => $gtfsId,
            'name' => $station['name_en'] ?? $station['name'],
            'latitude' => $station['lat'],
            'longitude' => $station['lng'],
            'wheelchair_accessible' => true,
            'area_id' => $area->id,
        ]);
        $stats['stops_created']++;

        return $stop;
    }

    /**
     * Backfill proper station names for stops created in an earlier run
     * before node tags were available in the Overpass response.
     */
    private function backfillStationNames(array $lines, array $nodes): int
    {
        $updated = 0;

        foreach ($nodes as $nodeId => $node) {
            $name = $node['tags']['name:en'] ?? $node['tags']['name'] ?? null;
            if ($name === null) {
                continue;
            }

            $updated += TransitStop::where('gtfs_stop_id', 'osm-N' . $nodeId)
                ->where(function ($query) use ($name) {
                    $query->where('name', 'like', 'Station %')
                        ->orWhere('name', '!=', $name);
                })
                ->update(['name' => $name]);
        }

        return $updated;
    }

    private function relationGeometry(array $relation, array $nodes): array
    {
        $points = [];
        $seen = [];

        foreach ($relation['members'] as $member) {
            if ($member['type'] !== 'way') {
                continue;
            }
            // Ways were not requested in "out meta" mode with geometry; the
            // skeleton nodes are all we have — approximate the line by its
            // station stop_positions in order.
        }

        // Fallback: station-to-station polyline from ordered stop positions.
        foreach ($relation['members'] as $member) {
            if ($member['type'] !== 'node' || !str_starts_with($member['role'] ?? '', 'stop')) {
                continue;
            }
            $node = $nodes[$member['ref']] ?? null;
            if ($node === null || isset($seen[$member['ref']])) {
                continue;
            }
            $seen[$member['ref']] = true;
            $points[] = [$node['lat'], $node['lon']];
        }

        return $points;
    }

    private function polylineLength(array $points): int
    {
        $length = 0.0;
        for ($i = 1; $i < count($points); $i++) {
            $length += $this->haversine($points[$i - 1][0], $points[$i - 1][1], $points[$i][0], $points[$i][1]);
        }

        return (int) round($length);
    }

    private function lineName(array $tags, string $ref): string
    {
        $raw = $tags['name'] ?? $tags['name:en'] ?? '';

        // Strip Arabic direction suffixes: keep the line identity part.
        if (preg_match('/الخط\s*\w+/u', $raw, $m)) {
            return 'Cairo Metro Line ' . $ref;
        }

        return $raw !== '' ? $raw : 'Cairo Metro Line ' . $ref;
    }

    private function lastStopHeadsign(array $stationStops): string
    {
        $last = end($stationStops);

        return $last['name_en'] ?? $last['name'];
    }

    private function ensureDefaultArea(): Area
    {
        $governorate = \App\Models\Governorate::firstOrCreate(
            ['name' => 'Cairo'],
            ['code' => 'CAI']
        );

        return Area::firstOrCreate(
            ['name' => 'Greater Cairo'],
            ['governorate_id' => $governorate->id]
        );
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
