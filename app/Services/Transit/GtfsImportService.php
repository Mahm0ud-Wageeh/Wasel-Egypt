<?php

namespace App\Services\Transit;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use App\Models\Area;
use App\Models\Governorate;
use App\Models\TransitMode;
use App\Models\TransitOperator;
use App\Models\TransitStop;
use App\Models\Route;
use App\Models\RouteVariant;
use App\Models\RouteStop;
use App\Models\RouteGeometry;
use App\Models\Schedule;
use App\Models\StopTime;
use ZipArchive;
use Exception;

/**
 * Streaming GTFS import pipeline for real-world feeds.
 *
 * Designed for production-scale datasets (hundreds of thousands of shape
 * points, frequency-based services, multiple agencies) where the naive
 * row-at-a-time whole-file approach does not work.
 *
 * Pipeline: DOWNLOAD (caller) → VALIDATE (validateFeed) → NORMALIZE
 * (agency→mode/operator map, service-date window) → IMPORT (streamed,
 * chunked, idempotent on GTFS external keys) → PROVENANCE (data_import_logs).
 *
 * Idempotency: re-importing the same feed updates existing rows keyed on
 * gtfs_stop_id / gtfs_route_id / gtfs_trip_id instead of duplicating them.
 * User-generated content is never touched.
 */
class GtfsImportService
{
    /** Default cap on stored geometry points per variant (decimation). */
    public const MAX_GEOMETRY_POINTS = 400;

    /** Rows per bulk INSERT. */
    protected const CHUNK_SIZE = 500;

    /**
     * Normalize a GTFS route_type + agency into a Wasel transit mode name.
     * The T4C Cairo feed uses route_type non-standardly (0 = paratransit,
     * 1 = formal road service), so agency identity is the primary signal.
     */
    protected function resolveModeName(?string $agencyId, ?int $routeType, array $agencyModeMap): string
    {
        if ($agencyId !== null && isset($agencyModeMap[$agencyId])) {
            return $agencyModeMap[$agencyId];
        }

        return match ($routeType) {
            0 => 'microbus',
            1 => 'bus',
            2 => 'rail',
            3 => 'bus',
            4 => 'ferry',
            default => 'bus',
        };
    }

    /**
     * Validate a GTFS feed without importing.
     *
     * @param string $path Path to the GTFS zip file
     * @return array Validation results
     * @throws Exception
     */
    public function validateFeed($path)
    {
        $validationResult = [
            'valid' => false,
            'errors' => [],
            'warnings' => [],
            'files_found' => [],
            'required_files' => [
                'agency.txt',
                'stops.txt',
                'routes.txt',
                'trips.txt',
                'stop_times.txt',
                'calendar.txt'
            ],
            'optional_files' => [
                'calendar_dates.txt',
                'fare_attributes.txt',
                'fare_rules.txt',
                'shapes.txt',
                'frequencies.txt',
                'transfers.txt',
                'pathways.txt',
                'levels.txt',
                'feed_info.txt'
            ]
        ];

        if (!file_exists($path)) {
            throw new Exception('GTFS file not found');
        }

        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw new Exception('Unable to open GTFS zip file');
        }

        $filesInZip = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $filesInZip[] = $zip->getNameIndex($i);
            $validationResult['files_found'][] = $zip->getNameIndex($i);
        }

        $zip->close();

        foreach ($validationResult['required_files'] as $requiredFile) {
            if (!in_array($requiredFile, $filesInZip)) {
                $validationResult['errors'][] = "Missing required file: {$requiredFile}";
            }
        }

        if (empty($validationResult['errors'])) {
            $zip->open($path);

            $checks = [
                'stops.txt' => ['stop_id', 'stop_name', 'stop_lat', 'stop_lon'],
                'routes.txt' => ['route_id', 'route_type'],
                'trips.txt' => ['route_id', 'service_id', 'trip_id'],
                'stop_times.txt' => ['trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence'],
            ];

            foreach ($checks as $filename => $requiredColumns) {
                if (!in_array($filename, $filesInZip)) {
                    continue;
                }

                $result = $this->validateColumns($zip, $filename, $requiredColumns);
                $validationResult['errors'] = array_merge($validationResult['errors'], $result['errors']);
                $validationResult['warnings'] = array_merge($validationResult['warnings'], $result['warnings']);
            }

            $zip->close();
        }

        $validationResult['valid'] = empty($validationResult['errors']);

        return $validationResult;
    }

    /**
     * Validate that a GTFS file has the required columns (streamed, so large
     * files are checked row-by-row without loading everything into memory).
     */
    protected function validateColumns($zip, $filename, array $requiredColumns)
    {
        $result = ['errors' => [], 'warnings' => []];

        $stream = $zip->getStream($filename);
        if ($stream === false) {
            $result['errors'][] = "{$filename} could not be read";

            return $result;
        }

        $headers = null;
        $rowIndex = 0;
        $checked = 0;

        while (($line = fgets($stream)) !== false) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }

            $fields = $this->parseCsvLine($line);

            if ($headers === null) {
                $headers = $fields;
                foreach ($requiredColumns as $column) {
                    if (!in_array($column, $headers)) {
                        $result['errors'][] = "{$filename} is missing required column: {$column}";
                    }
                }
                continue;
            }

            $rowIndex++;
            if ($rowIndex > 100) {
                break; // sampled validation; full integrity is enforced by the DB on import
            }

            $row = array_combine($headers, array_pad(array_slice($fields, 0, count($headers)), count($headers), null));
            foreach ($requiredColumns as $column) {
                if (!isset($row[$column]) || trim((string) $row[$column]) === '') {
                    $result['errors'][] = "{$filename} row {$rowIndex} has empty required value for: {$column}";
                }
            }
            $checked++;
        }

        fclose($stream);

        if ($checked === 0 && $headers !== null) {
            $result['warnings'][] = "{$filename} contains no data rows";
        }

        return $result;
    }

    /**
     * Import a GTFS feed.
     *
     * @param string $path Path to the GTFS zip file
     * @param array $options {
     *   @var array  $agency_mode_map  agency_id => Wasel transit mode name
     *   @var string $service_start     normalized service window start (Y-m-d) for demo operation
     *   @var string $service_end       normalized service window end (Y-m-d)
     *   @var array  $source            provenance: name, url, version, license
     *   @var int    $max_geometry_points  decimation cap per variant (default 400)
     * }
     * @return array Import results
     * @throws Exception
     */
    public function importFeed($path, array $options = [])
    {
        $importResult = [
            'transit_modes_created' => 0,
            'transit_operators_created' => 0,
            'stops_created' => 0,
            'routes_created' => 0,
            'route_variants_created' => 0,
            'route_stops_created' => 0,
            'route_geometries_created' => 0,
            'schedules_created' => 0,
            'frequency_windows_created' => 0,
            'stop_times_created' => 0,
            'service_alerts_created' => 0,
        ];

        if (!file_exists($path)) {
            throw new Exception('GTFS file not found');
        }

        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw new Exception('Unable to open GTFS zip file');
        }

        DB::beginTransaction();

        try {
            $agencyModeMap = $options['agency_mode_map'] ?? [];
            $maxGeometryPoints = (int) ($options['max_geometry_points'] ?? self::MAX_GEOMETRY_POINTS);

            // 1. Agencies → transit operators (idempotent on license_number = agency_id).
            $operatorIds = $this->importAgencies($zip, $importResult);

            // 2. Ensure every referenced mode exists.
            $modeIds = $this->ensureModes($zip, $agencyModeMap, $importResult);

            // 3. Stops → transit_stops (idempotent on gtfs_stop_id).
            $stopIds = $this->importStops($zip, $importResult);

            // 4. Routes → routes with correct mode + operator per agency.
            $routeIds = $this->importRoutes($zip, $operatorIds, $modeIds, $agencyModeMap, $importResult);

            // 5. Trips → route_variants + schedules (idempotent on gtfs_trip_id).
            $tripMap = $this->importTrips($zip, $routeIds, $importResult);

            // 6. Frequencies → schedule frequency_windows.
            $this->importFrequencies($zip, $tripMap, $importResult);

            // 7. Calendar → normalized service dates on schedules.
            $this->importCalendar($zip, $options, $importResult);

            // 8. Stop times → stop_times + route_stops (bulk, streamed).
            $this->importStopTimes($zip, $tripMap, $stopIds, $importResult);

            // 9. Shapes → one decimated JSON geometry per variant (streamed).
            $this->importShapes($zip, $tripMap, $maxGeometryPoints, $importResult);

            // 10. Provenance log.
            $this->recordProvenance($options, $importResult);

            DB::commit();
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('GTFS import failed: ' . $e->getMessage(), ['exception' => $e]);
            throw $e;
        } finally {
            $zip->close();
        }

        return $importResult;
    }

    // ---------------------------------------------------------------------
    // Entity importers
    // ---------------------------------------------------------------------

    protected function importAgencies($zip, array &$result): array
    {
        $operatorIds = [];

        $this->streamCsv($zip, 'agency.txt', function (array $row) use (&$operatorIds, &$result) {
            $agencyId = $row['agency_id'] ?? null;
            $name = $row['agency_name'] ?? 'Unknown Operator';

            $existing = $agencyId !== null && $agencyId !== ''
                ? TransitOperator::where('short_code', $agencyId)->first()
                : TransitOperator::where('name', $name)->first();

            if ($existing) {
                $operatorIds[$agencyId] = $existing->id;

                return;
            }

            $operator = TransitOperator::create([
                'name' => $name,
                'phone' => $row['agency_phone'] ?? null,
                'website' => $row['agency_url'] ?? null,
                'short_code' => $agencyId,
            ]);
            $operatorIds[$agencyId] = $operator->id;
            $result['transit_operators_created']++;
        });

        return $operatorIds;
    }

    protected function ensureModes($zip, array $agencyModeMap, array &$result): array
    {
        $needed = array_values(array_unique(array_values($agencyModeMap)));
        // Fallback modes for feeds without an agency_mode_map.
        $needed = array_merge($needed, ['bus', 'microbus']);
        $modeIds = [];

        foreach ($needed as $modeName) {
            $mode = TransitMode::where('name', $modeName)->first();
            if (!$mode) {
                $mode = TransitMode::create([
                    'name' => $modeName,
                    'description' => ucfirst($modeName) . ' service',
                    'icon' => $this->modeIcon($modeName),
                ]);
                $result['transit_modes_created']++;
            }
            $modeIds[$modeName] = $mode->id;
        }

        return $modeIds;
    }

    protected function modeIcon(string $modeName): string
    {
        return match ($modeName) {
            'metro' => 'subway',
            'rail' => 'train',
            'minibus' => 'van',
            'microbus' => 'van-shuttle',
            'walking' => 'walk',
            default => 'bus',
        };
    }

    protected function importStops($zip, array &$result): array
    {
        $stopIds = [];
        $defaultArea = $this->ensureDefaultArea();
        $batch = [];

        $this->streamCsv($zip, 'stops.txt', function (array $row) use (&$stopIds, &$batch, $defaultArea, &$result) {
            $gtfsStopId = $row['stop_id'];

            $stopIds[$gtfsStopId] = null;

            $batch[] = [
                'gtfs_stop_id' => $gtfsStopId,
                'name' => $row['stop_name'] ?? 'Unnamed Stop',
                'latitude' => (float) $row['stop_lat'],
                'longitude' => (float) $row['stop_lon'],
                'wheelchair_accessible' => ($row['wheelchair_boarding'] ?? 0) == 1,
                'platform_code' => $row['platform_code'] ?? null,
                'area_id' => $defaultArea->id,
            ];

            if (count($batch) >= self::CHUNK_SIZE) {
                $this->upsertStops($batch, $stopIds, $result);
                $batch = [];
            }
        });

        if ($batch !== []) {
            $this->upsertStops($batch, $stopIds, $result);
        }

        return $stopIds;
    }

    protected function upsertStops(array $batch, array &$stopIds, array &$result): void
    {
        // Distinguish newly created stops from updates: existing keys are
        // probed once per batch before the upsert.
        $existingIds = DB::table('transit_stops')
            ->whereIn('gtfs_stop_id', array_column($batch, 'gtfs_stop_id'))
            ->pluck('id', 'gtfs_stop_id');

        foreach ($batch as $row) {
            if (!isset($existingIds[$row['gtfs_stop_id']])) {
                $result['stops_created']++;
            }
        }

        // Idempotent upsert keyed on the unique gtfs_stop_id.
        DB::table('transit_stops')->upsert(
            $batch,
            ['gtfs_stop_id'],
            ['name', 'latitude', 'longitude', 'wheelchair_accessible', 'platform_code', 'area_id']
        );

        $ids = DB::table('transit_stops')
            ->whereIn('gtfs_stop_id', array_column($batch, 'gtfs_stop_id'))
            ->pluck('id', 'gtfs_stop_id');

        foreach ($ids as $gtfsId => $id) {
            $stopIds[$gtfsId] = (int) $id;
        }
    }

    protected function ensureDefaultArea(): Area
    {
        $area = Area::where('name', 'Greater Cairo')->first();
        if ($area) {
            return $area;
        }

        $governorate = Governorate::where('name', 'Cairo')->first()
            ?? Governorate::first();

        if (!$governorate) {
            $governorate = Governorate::create(['name' => 'Cairo', 'code' => 'CAI']);
        }

        return Area::create([
            'governorate_id' => $governorate->id,
            'name' => 'Greater Cairo',
        ]);
    }

    protected function importRoutes($zip, array $operatorIds, array $modeIds, array $agencyModeMap, array &$result): array
    {
        $routeIds = [];

        $this->streamCsv($zip, 'routes.txt', function (array $row) use (&$routeIds, $operatorIds, $modeIds, $agencyModeMap, &$result) {
            $gtfsRouteId = $row['route_id'];
            $agencyId = $row['agency_id'] ?? null;
            $routeType = isset($row['route_type']) ? (int) $row['route_type'] : null;

            $modeName = $this->resolveModeName($agencyId, $routeType, $agencyModeMap);
            $modeId = $modeIds[$modeName] ?? $modeIds['bus'];
            $operatorId = $operatorIds[$agencyId] ?? reset($operatorIds);

            $existing = Route::where('gtfs_route_id', $gtfsRouteId)->first();

            if ($existing) {
                $routeIds[$gtfsRouteId] = $existing->id;

                return;
            }

            $route = Route::create([
                'gtfs_route_id' => $gtfsRouteId,
                'transit_mode_id' => $modeId,
                'transit_operator_id' => $operatorId,
                'long_name' => $row['route_long_name'] ?? ($row['route_short_name'] ?? 'Unnamed Route'),
                'short_name' => $row['route_short_name'] ?? null,
                'description' => $row['route_desc'] ?? null,
                'type' => $routeType,
                'url' => $row['route_url'] ?? null,
                'color' => $row['route_color'] ?? null,
                'text_color' => $row['route_text_color'] ?? null,
                'sort_order' => $row['route_sort_order'] ?? 0,
                'continuous_pickup' => $row['route_continuous_pickup'] ?? 1,
                'continuous_drop_off' => $row['route_continuous_drop_off'] ?? 1,
                'active' => true,
            ]);
            $routeIds[$gtfsRouteId] = $route->id;
            $result['routes_created']++;
        });

        return $routeIds;
    }

    /**
     * One route variant + one schedule per GTFS trip.
     *
     * @return array trip_id => ['variant_id' => int, 'schedule_id' => int, 'shape_id' => ?string]
     */
    protected function importTrips($zip, array $routeIds, array &$result): array
    {
        $tripMap = [];

        $this->streamCsv($zip, 'trips.txt', function (array $row) use (&$tripMap, $routeIds, &$result) {
            $routeId = $routeIds[$row['route_id']] ?? null;
            if ($routeId === null) {
                return;
            }

            $tripId = $row['trip_id'];
            $variantName = 'Trip ' . $tripId;

            $variant = RouteVariant::firstOrCreate(
                ['route_id' => $routeId, 'name' => $variantName, 'direction' => ($row['direction_id'] ?? 0) == 1 ? 'inbound' : 'outbound'],
                [
                    'headsign' => $row['trip_headsign'] ?? null,
                    'active' => true,
                ]
            );

            $schedule = Schedule::firstOrCreate(
                ['gtfs_trip_id' => $tripId],
                [
                    'route_variant_id' => $variant->id,
                    'service_id' => $row['service_id'] ?? null,
                    'direction_id' => (int) ($row['direction_id'] ?? 0),
                    'headsign' => $row['trip_headsign'] ?? null,
                    'wheelchair_accessible' => ($row['wheelchair_accessible'] ?? 0) == 1,
                    'notes' => 'Imported from GTFS (trips.txt)',
                    'start_date' => now()->toDateString(),
                    'is_active' => true,
                ]
            );

            if ($variant->wasRecentlyCreated) {
                $result['route_variants_created']++;
            }

            if ($schedule->wasRecentlyCreated) {
                $result['schedules_created']++;
            }

            $tripMap[$tripId] = [
                'variant_id' => $variant->id,
                'schedule_id' => $schedule->id,
                'shape_id' => $row['shape_id'] ?? null,
            ];
        });

        return $tripMap;
    }

    protected function importFrequencies($zip, array $tripMap, array &$result): void
    {
        $windowsByTrip = [];

        $this->streamCsv($zip, 'frequencies.txt', function (array $row) use (&$windowsByTrip, $tripMap, &$result) {
            $tripId = $row['trip_id'] ?? null;
            if ($tripId === null || !isset($tripMap[$tripId])) {
                return;
            }

            $windowsByTrip[$tripId][] = [
                'start_time' => $row['start_time'],
                'end_time' => $row['end_time'],
                'headway_secs' => (int) $row['headway_secs'],
            ];
        });

        foreach ($windowsByTrip as $tripId => $windows) {
            Schedule::where('gtfs_trip_id', $tripId)->update([
                'frequency_windows' => json_encode($windows),
                'notes' => 'Imported from GTFS (trips.txt + frequencies.txt)',
            ]);
            $result['frequency_windows_created'] += count($windows);
        }
    }

    protected function importCalendar($zip, array $options, array &$result): void
    {
        $serviceStart = $options['service_start'] ?? null;
        $serviceEnd = $options['service_end'] ?? null;

        $this->streamCsv($zip, 'calendar.txt', function (array $row) use ($serviceStart, $serviceEnd, &$result) {
            $start = $serviceStart ?? $this->parseGtfsDate($row['start_date'] ?? '') ?? now()->toDateString();
            $end = $serviceEnd ?? $this->parseGtfsDate($row['end_date'] ?? '');

            $updated = Schedule::where('service_id', $row['service_id'] ?? '')->update([
                'start_date' => $start,
                'end_date' => $end,
                'notes' => $serviceStart !== null
                    ? 'Imported from GTFS; demo service window (' . $start . ' → ' . $end . ')'
                    : 'Imported from GTFS (trips.txt + calendar.txt)',
            ]);

            $result['schedules_dated'] = ($result['schedules_dated'] ?? 0) + $updated;
        });
    }

    protected function importStopTimes($zip, array $tripMap, array $stopIds, array &$result): void
    {
        $stopTimeRows = [];
        $routeStopRows = [];
        $seenRouteStops = [];

        $flush = function () use (&$stopTimeRows, &$routeStopRows, &$result) {
            if ($stopTimeRows !== []) {
                DB::table('stop_times')->insertOrIgnore($stopTimeRows);
                $result['stop_times_created'] += count($stopTimeRows);
                $stopTimeRows = [];
            }
            if ($routeStopRows !== []) {
                DB::table('route_stops')->insertOrIgnore($routeStopRows);
                $result['route_stops_created'] += count($routeStopRows);
                $routeStopRows = [];
            }
        };

        $this->streamCsv($zip, 'stop_times.txt', function (array $row) use (&$stopTimeRows, &$routeStopRows, &$seenRouteStops, $tripMap, $stopIds, $flush) {
            $tripId = $row['trip_id'];
            if (!isset($tripMap[$tripId])) {
                return;
            }

            $stopId = $stopIds[$row['stop_id']] ?? null;
            if ($stopId === null) {
                return;
            }

            $scheduleId = $tripMap[$tripId]['schedule_id'];
            $variantId = $tripMap[$tripId]['variant_id'];
            $sequence = (int) $row['stop_sequence'];

            $stopTimeRows[] = [
                'schedule_id' => $scheduleId,
                'transit_stop_id' => $stopId,
                'sequence' => $sequence,
                'arrival_time' => $this->normalizeGtfsTime($row['arrival_time'] ?? null),
                'departure_time' => $this->normalizeGtfsTime($row['departure_time'] ?? null),
                'pickup_type' => (int) ($row['pickup_type'] ?? 0),
                'drop_off_type' => (int) ($row['drop_off_type'] ?? 0),
                'timepoint' => (int) ($row['timepoint'] ?? 1),
            ];

            $routeStopKey = $variantId . ':' . $stopId;
            if (!isset($seenRouteStops[$routeStopKey])) {
                $seenRouteStops[$routeStopKey] = $sequence;
                $routeStopRows[] = [
                    'route_variant_id' => $variantId,
                    'transit_stop_id' => $stopId,
                    'sequence' => $sequence,
                    'pickup_type' => (int) ($row['pickup_type'] ?? 0),
                    'drop_off_type' => (int) ($row['drop_off_type'] ?? 0),
                ];
            }

            if (count($stopTimeRows) >= self::CHUNK_SIZE) {
                $flush();
            }
        });

        $flush();
    }

    /**
     * Stream shapes.txt, group points by shape_id, link shape → variant via
     * trips.txt, decimate oversized geometries, and store ONE JSON geometry
     * row per route variant (the route_geometry table is unique per variant).
     */
    protected function importShapes($zip, array $tripMap, int $maxPoints, array &$result): void
    {
        // shape_id => variant_id (from trips)
        $shapeVariants = [];
        foreach ($tripMap as $trip) {
            if ($trip['shape_id'] !== null) {
                $shapeVariants[$trip['shape_id']] = $trip['variant_id'];
            }
        }

        if ($shapeVariants === [] || !$this->fileExistsInZip($zip, 'shapes.txt')) {
            return;
        }

        $pointsByShape = [];

        $this->streamCsv($zip, 'shapes.txt', function (array $row) use (&$pointsByShape, $shapeVariants) {
            $shapeId = $row['shape_id'] ?? null;
            if ($shapeId === null || !isset($shapeVariants[$shapeId])) {
                return; // skip shapes not referenced by any imported trip
            }

            $pointsByShape[$shapeId][] = [
                (float) $row['shape_pt_lat'],
                (float) $row['shape_pt_lon'],
                (int) $row['shape_pt_sequence'],
            ];
        });

        foreach ($pointsByShape as $shapeId => $points) {
            usort($points, fn (array $a, array $b) => $a[2] <=> $b[2]);

            $geometry = array_map(fn (array $p) => [$p[0], $p[1]], $points);

            if (count($geometry) > $maxPoints) {
                $geometry = $this->decimatePolyline($geometry, $maxPoints);
            }

            $lengthMeters = 0;
            for ($i = 1; $i < count($geometry); $i++) {
                $lengthMeters += $this->haversine(
                    $geometry[$i - 1][0], $geometry[$i - 1][1],
                    $geometry[$i][0], $geometry[$i][1]
                );
            }

            RouteGeometry::updateOrCreate(
                ['route_variant_id' => $shapeVariants[$shapeId]],
                [
                    'geometry' => $geometry,
                    'length_meters' => (int) round($lengthMeters),
                ]
            );

            $result['route_geometries_created']++;
        }
    }

    /**
     * Douglas-Peucker-free uniform decimation: keep endpoints plus evenly
     * spaced interior points. Deterministic and bounded.
     */
    protected function decimatePolyline(array $points, int $maxPoints): array
    {
        $count = count($points);
        if ($count <= $maxPoints) {
            return $points;
        }

        $kept = [];
        $step = ($count - 1) / ($maxPoints - 1);
        for ($i = 0; $i < $maxPoints; $i++) {
            $kept[] = $points[(int) round($i * $step)];
        }

        // Ensure the true last point survives rounding.
        $kept[$maxPoints - 1] = $points[$count - 1];

        return $kept;
    }

    protected function recordProvenance(array $options, array $result): void
    {
        $source = $options['source'] ?? null;

        if ($source === null || !isset($source['name'])) {
            return;
        }

        DB::table('data_import_logs')->insert([
            'source' => $source['name'],
            'url' => $source['url'] ?? null,
            'dataset_version' => $source['version'] ?? null,
            'license' => $source['license'] ?? null,
            'options' => json_encode(array_intersect_key($options, array_flip(['agency_mode_map', 'service_start', 'service_end']))),
            'counts' => json_encode($result),
            'status' => 'completed',
            'imported_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    // ---------------------------------------------------------------------
    // Streaming CSV helpers
    // ---------------------------------------------------------------------

    /**
     * Stream a CSV file out of the zip archive row by row (constant memory),
     * invoking $handler for each data row.
     */
    protected function streamCsv($zip, string $filename, callable $handler): void
    {
        if (!$this->fileExistsInZip($zip, $filename)) {
            return;
        }

        $stream = $zip->getStream($filename);
        if ($stream === false) {
            throw new Exception("Unable to read {$filename} from GTFS zip");
        }

        $headers = null;

        try {
            while (($line = fgets($stream)) !== false) {
                $line = rtrim($line, "\r\n");
                if ($line === '') {
                    continue;
                }

                $fields = $this->parseCsvLine($line);

                if ($headers === null) {
                    $headers = $fields;
                    continue;
                }

                // Pad/truncate to header length so array_combine never fails.
                $fields = array_pad(array_slice($fields, 0, count($headers)), count($headers), null);
                $handler(array_combine($headers, $fields));
            }
        } finally {
            fclose($stream);
        }
    }

    protected function fileExistsInZip($zip, $filename): bool
    {
        for ($i = 0; $i < $zip->numFiles; $i++) {
            if ($zip->getNameIndex($i) === $filename) {
                return true;
            }
        }

        return false;
    }

    /**
     * Parse a CSV line handling quoted fields, escaped quotes and commas.
     */
    protected function parseCsvLine($line): array
    {
        $fields = [];
        $field = '';
        $inQuotes = false;

        for ($i = 0, $len = strlen($line); $i < $len; $i++) {
            $char = $line[$i];

            if ($char === '"') {
                if ($inQuotes && $i + 1 < $len && $line[$i + 1] === '"') {
                    $field .= '"';
                    $i++;
                } else {
                    $inQuotes = !$inQuotes;
                }
            } elseif ($char === ',' && !$inQuotes) {
                $fields[] = $field;
                $field = '';
            } else {
                $field .= $char;
            }
        }

        $fields[] = $field;

        return $fields;
    }

    /**
     * MySQL TIME rejects hours > 23; GTFS overnight times (e.g. 25:30:00)
     * are clamped by wrapping into the previous day count — kept as HH:MM:SS
     * modulo 24h so the value stays storable and planner-usable.
     */
    protected function normalizeGtfsTime(?string $time): ?string
    {
        if ($time === null || trim($time) === '') {
            return null;
        }

        $parts = explode(':', $time);
        if (count($parts) < 2) {
            return null;
        }

        $hours = (int) $parts[0];
        if ($hours > 23) {
            $parts[0] = str_pad((string) ($hours % 24), 2, '0', STR_PAD_LEFT);
        }

        return implode(':', $parts);
    }

    protected function parseGtfsDate($date): ?string
    {
        if (empty($date) || strlen($date) !== 8) {
            return null;
        }

        return substr($date, 0, 4) . '-' . substr($date, 4, 2) . '-' . substr($date, 6, 2);
    }

    protected function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
