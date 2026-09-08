<?php

namespace App\Console\Commands;

use App\Services\Transit\GtfsImportService;
use Exception;
use Illuminate\Console\Command;

/**
 * Import a GTFS feed from a local zip path (or a direct URL) with full
 * provenance metadata. Runs outside the HTTP request cycle because real
 * feeds contain hundreds of thousands of rows.
 *
 * Examples:
 *   php artisan gtfs:import storage/app/gtfs-sources/mdb-3355-latest.zip \
 *     --source-name=mobilitydb:mdb-3355 \
 *     --source-url=https://mobilitydatabase.org/feeds/gtfs/mdb-3355 \
 *     --source-version=mdb-3355-202607092128 \
 *     --license=CC-BY-NC-SA-2.0 \
 *     --service-start=2026-09-01 --service-end=2027-09-01
 */
class GtfsImport extends Command
{
    protected $signature = 'gtfs:import {path : Path or URL to the GTFS zip}
        {--source-name= : Provenance source identifier (e.g. mobilitydb:mdb-3355)}
        {--source-url= : Dataset URL}
        {--source-version= : Dataset version/timestamp}
        {--license= : Dataset license (e.g. CC-BY-NC-SA-2.0)}
        {--service-start= : Normalized demo service window start (Y-m-d)}
        {--service-end= : Normalized demo service window end (Y-m-d)}
        {--agency-mode-map= : JSON object agency_id => transit mode name}
        {--max-geometry-points= : Decimation cap per variant geometry}';

    protected $description = 'Import a GTFS feed with streaming, normalization and provenance logging';

    public function handle(GtfsImportService $service): int
    {
        set_time_limit(0);
        ini_set('memory_limit', '1G');

        $path = $this->argument('path');

        if (preg_match('#^https?://#i', $path)) {
            $this->info("Downloading {$path} ...");
            $tmp = storage_path('app/gtfs-sources/import-' . uniqid() . '.zip');
            if (!@copy($path, $tmp)) {
                $this->error('Download failed');

                return self::FAILURE;
            }
            $path = $tmp;
        }

        if (!is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        $validation = $service->validateFeed($path);
        if (!$validation['valid']) {
            $this->error('Feed validation failed:');
            foreach ($validation['errors'] as $error) {
                $this->line("  - {$error}");
            }

            return self::FAILURE;
        }

        $agencyModeMap = [];
        if ($raw = $this->option('agency-mode-map')) {
            $agencyModeMap = json_decode($raw, true) ?? [];
            if ($agencyModeMap === [] && json_last_error() !== JSON_ERROR_NONE) {
                $this->error('Invalid --agency-mode-map JSON');

                return self::FAILURE;
            }
        }

        $options = array_filter([
            'agency_mode_map' => $agencyModeMap,
            'service_start' => $this->option('service-start') ?: null,
            'service_end' => $this->option('service-end') ?: null,
            'max_geometry_points' => $this->option('max-geometry-points') ? (int) $this->option('max-geometry-points') : null,
            'source' => $this->option('source-name') ? [
                'name' => $this->option('source-name'),
                'url' => $this->option('source-url'),
                'version' => $this->option('source-version'),
                'license' => $this->option('license'),
            ] : null,
        ], fn ($v) => $v !== null && $v !== []);

        try {
            $this->info('Importing (streamed)...');
            $result = $service->importFeed($path, $options);
        } catch (Exception $e) {
            $this->error('Import failed: ' . $e->getMessage());

            return self::FAILURE;
        }

        $this->info('Import complete:');
        foreach ($result as $key => $count) {
            $this->line(sprintf('  %-32s %s', str_replace('_', ' ', $key), $count));
        }

        return self::SUCCESS;
    }
}
