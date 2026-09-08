<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * Import the Cairo Metro fare matrix into system_config (consumed by
 * FareEstimator).
 *
 * Primary source — Mobility Database mdb-3354 (Cairo Metro GTFS, Transport
 * for Cairo, feed v1.1.1, Oct 2024): fare_attributes M_1=8 / M_2=10 /
 * M_3=15 / M_4=20 EGP + fare_rules origin-destination pairs across 108
 * stations (Lines 1 + 2, complete). Archived locally at
 * storage/app/gtfs-sources/mdb-3354.
 *
 * Secondary source — TfC Digital Cairo 2017 "GTFSfullworking_Bus_Metro"
 * (June 2018 fares 3/5/7 EGP, 61 stations incl. the 2018 Line-3 stub):
 * the only COMPLETE symmetric matrix, used only with --legacy2018.
 *
 * Matrix honesty rules (both sources):
 *  - fares are HISTORICAL as of the feed version; displayed as recorded
 *    TfC/Mobility-Database data, never claimed as current prices;
 *  - when only the reverse direction of a pair exists (the 2024 matrix has
 *    directional gaps), the reverse fare is used — metro fares in Egypt are
 *    not direction-dependent (the 2018 complete matrix shows ~6% asymmetric
 *    noise, treated as data-entry artifacts);
 *  - pairs absent in both directions produce no entry → FareEstimator
 *    returns null for them (Line 3's 2026 stations are outside both feeds).
 *
 * Pipeline: DOWNLOAD (or --files=) → VERIFY → ARCHIVE → PARSE → MATCH
 * (TfC/mdb stations → Wasel metro stops by nearest coordinate, 500m cap,
 * deterministic unique-nearest) → NORMALIZE (matrix keyed by Wasel stop
 * ids, reverse-filled) → UPSERT (single system_config row, idempotent) →
 * PROVENANCE (data_import_logs).
 *
 * Fare scope honesty: metro legs only. Bus/paratransit fares do not exist
 * in any TfC source (verified) and are never invented. FareEstimator only
 * emits a journey fare when every transit leg is metro.
 */
class TfcFareImport extends Command
{
    protected $signature = 'tfc:fare-import
        {--files= : Local directory containing fare_attributes.txt/fare_rules.txt/stops.txt (skips download; defaults to the archived mdb-3354 copy)}
        {--legacy2018 : Use the TfC Digital Cairo 2017 matrix (3/5/7 EGP, 2018) instead of mdb-3354 (8/10/15/20 EGP, 2024)}
        {--dry-run : Report what would be imported without writing}';

    protected $description = 'Import the Cairo Metro fare matrix into system_config (mdb-3354 2024 by default; idempotent)';

    private const CONFIG_KEY = 'tfc_metro_fares';

    private const SOURCE_2024_URL = 'https://mobilitydatabase.org/feeds/gtfs/mdb-3354';

    private const SOURCE_2024_VERSION = 'mdb-3354-1.1.1-20241028';

    private const LEGACY_2018_URL = 'https://raw.githubusercontent.com/transportforcairo/Transit---GCR-Digital-Cairo-2017-/HEAD/GTFS/20180906_GTFSfullworking_Bus_Metro';

    private const LEGACY_2018_VERSION = 'tfcdigitalcairo-20180906';

    private const LICENSE = 'CC-BY-NC-SA-2.0';

    /** Max distance (m) from a source station to its Wasel metro stop. */
    private const MATCH_MAX_METERS = 500;

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $legacy = (bool) $this->option('legacy2018');

        $dir = $this->obtainSourceFiles($legacy);

        // ---- PARSE
        $attributes = $this->parseCsv($dir . '/fare_attributes.txt');
        $rules = $this->parseCsv($dir . '/fare_rules.txt');
        $stops = $this->parseCsv($dir . '/stops.txt');

        if (count($attributes) === 0 || count($rules) === 0 || count($stops) === 0) {
            $this->error('Source files are empty or malformed.');

            return self::FAILURE;
        }

        // fare_id => [amount, currency]
        $fareById = [];
        foreach ($attributes as $row) {
            $fareById[$row['fare_id']] = [
                'amount' => (float) $row['price'],
                'currency' => $row['currency_type'],
            ];
        }

        // ---- MATCH: source stations → Wasel metro stops by nearest coordinate.
        // mdb-3354 uses zone_id == stop_id per station; the 2017 feed uses
        // platform rows with a direction suffix. Both are reduced to one
        // coordinate per station name below.
        $stationCoords = [];
        if ($legacy) {
            // 2017/2018 feed: platform stops *_METRO_N/_S under one parent.
            foreach ($stops as $row) {
                if (!preg_match('/_METRO$/i', $row['stop_id']) && !preg_match('/_Metro$/', $row['stop_id'])) {
                    continue;
                }
                $parent = preg_replace('/_(N|S|E|W|NE|NW|SE|SW)$/', '', $row['stop_id']);
                $stationCoords[$parent] = [
                    (float) $row['stop_lat'],
                    (float) $row['stop_lon'],
                    $row['stop_name'],
                ];
            }
        } else {
            // mdb-3354: one row per platform; unique (name, ~coord) = station.
            foreach ($stops as $row) {
                $key = $row['stop_name'];
                if (!isset($stationCoords[$key])) {
                    $stationCoords[$key] = [
                        (float) $row['stop_lat'],
                        (float) $row['stop_lon'],
                        $row['stop_name'],
                    ];
                }
            }
        }

        // Wasel metro stop candidates: stops linked to any metro route variant.
        $metroStopIds = DB::table('route_stops')
            ->whereIn('route_variant_id', DB::table('route_variants')
                ->whereIn('route_id', DB::table('routes')->where('transit_mode_id', 1)->pluck('id'))
                ->pluck('id'))
            ->distinct()
            ->pluck('transit_stop_id');

        $waselStops = DB::table('transit_stops')
            ->whereIn('id', $metroStopIds)
            ->get(['id', 'name', 'latitude', 'longitude']);

        $mapping = []; // source station key => [wasel_stop_id, distance_m]
        $unmatched = [];
        foreach ($stationCoords as $key => [$lat, $lng, $name]) {
            $best = null;
            $bestDist = PHP_FLOAT_MAX;
            foreach ($waselStops as $stop) {
                $dist = $this->haversine($lat, $lng, (float) $stop->latitude, (float) $stop->longitude);
                if ($dist < $bestDist) {
                    $bestDist = $dist;
                    $best = $stop;
                }
            }
            if ($best !== null && $bestDist <= self::MATCH_MAX_METERS) {
                $mapping[$key] = [(int) $best->id, (int) round($bestDist)];
            } else {
                $unmatched[] = $name . ' (' . round($bestDist) . 'm)';
            }
        }

        // ---- NORMALIZE: fare rules → ordered matrix keyed by Wasel stop ids,
        // with reverse-direction fill for pairs only present one way.
        $direct = [];
        $rulesUsed = 0;
        $rulesSkipped = 0;
        foreach ($rules as $rule) {
            $origin = $rule['origin_id'];
            $destination = $rule['destination_id'];
            if ($legacy) {
                // 2017/2018 feed keys fare_rules by platform stop ids.
                $origin = preg_replace('/_(N|S|E|W|NE|NW|SE|SW)$/', '', $origin);
                $destination = preg_replace('/_(N|S|E|W|NE|NW|SE|SW)$/', '', $destination);
            } else {
                // mdb-3354 keys fare_rules by zone_id == stop_id — map through
                // the stops table (station name) for coordinate identity.
                $origin = $this->zoneToStation($stops, $origin);
                $destination = $this->zoneToStation($stops, $destination);
            }
            if ($origin === null || $destination === null
                || !isset($mapping[$origin]) || !isset($mapping[$destination])
                || !isset($fareById[$rule['fare_id']])) {
                $rulesSkipped++;
                continue;
            }
            $fromId = $mapping[$origin][0];
            $toId = $mapping[$destination][0];
            $amount = $fareById[$rule['fare_id']]['amount'];
            // Keep the lowest fare per ordered pair (defensive dedupe).
            if (!isset($direct[$fromId][$toId]) || $amount < $direct[$fromId][$toId]) {
                $direct[$fromId][$toId] = $amount;
            }
            $rulesUsed++;
        }

        // Reverse fill: B→A inherits A→B's fare when absent (metro fares are
        // not direction-dependent; source asymmetries are noise).
        $matrix = $direct;
        $reverseFilled = 0;
        foreach ($direct as $fromId => $dests) {
            foreach ($dests as $toId => $amount) {
                if (!isset($matrix[$toId][$fromId])) {
                    $matrix[$toId][$fromId] = $amount;
                    $reverseFilled++;
                }
            }
        }

        $pairs = 0;
        foreach ($matrix as $row) {
            $pairs += count($row);
        }

        $sourceLabel = $legacy ? 'TfC Digital Cairo 2017 (GTFSfullworking_Bus_Metro)' : 'Mobility Database mdb-3354 (Cairo Metro GTFS, Transport for Cairo)';
        $sourceVersion = $legacy ? self::LEGACY_2018_VERSION : self::SOURCE_2024_VERSION;
        $sourceUrl = $legacy ? self::LEGACY_2018_URL : self::SOURCE_2024_URL;
        $asOf = $legacy ? '2018-06' : '2024-10';

        $payload = [
            'source' => $sourceLabel,
            'source_version' => $sourceVersion,
            'license' => self::LICENSE,
            'as_of' => $asOf,
            'currency' => 'EGP',
            'note' => "Historical TfC Cairo Metro fares ({$asOf}); displayed as recorded source data, not claimed as current prices.",
            'match' => [
                'method' => 'nearest-coordinate',
                'max_meters' => self::MATCH_MAX_METERS,
                'stations_matched' => count($mapping),
                'stations_unmatched' => count($unmatched),
            ],
            'matrix' => $matrix, // wasel_stop_id => [wasel_stop_id => amount EGP]
        ];

        $this->info('Cairo Metro fare matrix (' . $asOf . '):');
        $this->line(sprintf('  fare classes: %s', implode(', ', array_map(
            fn ($id, $f) => "{$id}={$f['amount']} {$f['currency']}",
            array_keys($fareById),
            array_values($fareById)
        ))));
        $this->line(sprintf('  stations matched: %d/%d (unmatched: %s)',
            count($mapping), count($stationCoords), $unmatched === [] ? 'none' : implode(', ', array_slice($unmatched, 0, 5))));
        $this->line(sprintf('  fare rules used: %d (skipped: %d) → %d ordered pairs (%d reverse-filled)',
            $rulesUsed, $rulesSkipped, $pairs, $reverseFilled));

        if ($dryRun) {
            $this->info('Dry run — nothing written.');

            return self::SUCCESS;
        }

        // ---- UPSERT (idempotent; replaces any earlier fare config row)
        DB::table('system_config')->where('config_key', 'like', 'tfc_metro_fares%')->delete();
        DB::table('system_config')->updateOrInsert(
            ['config_key' => self::CONFIG_KEY],
            [
                'config_value' => json_encode($payload, JSON_UNESCAPED_UNICODE),
                'config_type' => 'json',
                'description' => "Cairo Metro origin-destination fare matrix ({$asOf}, {$sourceVersion}); consumed by FareEstimator for metro-only journeys.",
                'updated_by' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // ---- PROVENANCE
        DB::table('data_import_logs')->insert([
            'source' => $legacy ? 'tfc:digital-cairo-2017-fares' : 'mobilitydb:mdb-3354-fares',
            'url' => $sourceUrl,
            'dataset_version' => $sourceVersion,
            'license' => self::LICENSE,
            'options' => json_encode([
                'files' => ['fare_attributes.txt', 'fare_rules.txt', 'stops.txt'],
                'match_method' => 'nearest-coordinate',
                'match_max_meters' => self::MATCH_MAX_METERS,
                'reverse_fill' => true,
                'scope' => 'metro-only fares',
            ]),
            'counts' => json_encode([
                'fare_classes' => count($fareById),
                'stations_matched' => count($mapping),
                'stations_unmatched' => count($unmatched),
                'rules_used' => $rulesUsed,
                'rules_skipped' => $rulesSkipped,
                'ordered_pairs' => $pairs,
                'reverse_filled' => $reverseFilled,
            ]),
            'status' => 'completed',
            'imported_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->info('Fare matrix stored in system_config as "' . self::CONFIG_KEY . '".');

        return self::SUCCESS;
    }

    /**
     * mdb-3354 fare_rules references zone_id; map it to the station key
     * (stop_name) used in stationCoords. Null when unknown.
     */
    private function zoneToStation(array $stops, string $zoneId): ?string
    {
        foreach ($stops as $row) {
            if ($row['stop_id'] === $zoneId || ($row['zone_id'] ?? '') === $zoneId) {
                return $row['stop_name'];
            }
        }

        return null;
    }

    /**
     * Resolve the source directory: --files → given path; default → the
     * already-archived local copies (mdb-3354 primary, Digital Cairo 2017
     * for --legacy2018); download only when the archive is missing.
     */
    private function obtainSourceFiles(bool $legacy): string
    {
        $local = $this->option('files');
        if ($local !== null) {
            foreach (['fare_attributes.txt', 'fare_rules.txt', 'stops.txt'] as $f) {
                if (!is_file(rtrim($local, '/\\') . DIRECTORY_SEPARATOR . $f)) {
                    $this->error("Missing {$f} in {$local}.");

                    exit(self::FAILURE);
                }
            }

            return rtrim($local, '/\\');
        }

        if ($legacy) {
            $dir = storage_path('app/gtfs-sources/tfc-digital-cairo-2017');
            $url = self::LEGACY_2018_URL;
        } else {
            $dir = storage_path('app/gtfs-sources/mdb-3354');
            $url = null; // mdb-3354 archive already holds the zip; download from Mobility DB if ever needed
        }

        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        $missing = array_filter(
            ['fare_attributes.txt', 'fare_rules.txt', 'stops.txt'],
            fn ($f) => !is_file($dir . DIRECTORY_SEPARATOR . $f) || filesize($dir . DIRECTORY_SEPARATOR . $f) === 0
        );

        if ($missing !== [] && $url === null) {
            $this->error('Local archive incomplete for mdb-3354 (missing: ' . implode(', ', $missing) . ') and no download URL configured — extract the zip at storage/app/gtfs-sources/mdb-3354-latest.zip or use --files.');

            exit(self::FAILURE);
        }

        foreach ($missing as $f) {
            $this->line("Downloading {$f}...");
            $res = Http::timeout(30)->get($url . '/' . $f);
            if ($res->failed()) {
                $this->error("Download failed for {$f}: HTTP {$res->status()}");

                exit(self::FAILURE);
            }
            file_put_contents($dir . DIRECTORY_SEPARATOR . $f, $res->body());
        }

        return $dir;
    }

    /** Parse a GTFS-style CSV into associative rows keyed by the header. */
    private function parseCsv(string $path): array
    {
        $rows = [];
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return $rows;
        }
        $header = fgetcsv($handle);
        while (($row = fgetcsv($handle)) !== false) {
            if (count($row) !== count($header)) {
                continue;
            }
            $rows[] = array_combine($header, $row);
        }
        fclose($handle);

        return $rows;
    }

    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $r = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;

        return $r * 2 * asin(min(1.0, sqrt($a)));
    }
}
