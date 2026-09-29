<?php

namespace App\Console\Commands;

use App\Services\Transit\TransitQualityService;
use Illuminate\Console\Command;

/**
 * Automated transit-data quality report over the REAL database state.
 *
 * Every number is computed from the live tables — nothing fabricated.
 * Checks cover: stop coordinates, duplicate/missing references, broken
 * route-stop relations, impossible schedules, missing geometries, and
 * stale feeds.
 */
class TransitQualityReport extends Command
{
    protected $signature = 'transit:quality-report {--json : Output machine-readable JSON}';

    protected $description = 'Run data-quality checks over the imported transit network and report real counts';

    public function handle(TransitQualityService $qualityService): int
    {
        $report = $qualityService->report();

        if ($this->option('json')) {
            $this->line(json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            return self::SUCCESS;
        }

        $this->renderConsole($report);

        return self::SUCCESS;
    }

    private function renderConsole(array $report): void
    {
        $s = $report['summary'];
        $this->info('Wasel Egypt — Transit Data Quality Report');
        $this->line('Generated: ' . $report['generated_at']);
        $this->newLine();

        $this->renderSection('Stops', [
            ['Total', $report['stops']['total']],
            ['Valid coordinates (Egypt bbox)', $report['stops']['valid_coordinates']],
            ['Outside Egypt bbox (critical)', $report['stops']['outside_egypt_bbox']],
            ['Missing name (critical)', $report['stops']['missing_name']],
            ['No area assigned (critical)', $report['stops']['no_area_assigned']],
            ['Duplicate name+coords (warning)', $report['stops']['duplicate_names_same_coords']],
            ['Wheelchair accessible', $report['stops']['wheelchair_accessible']],
        ]);

        $this->renderSection('Routes', [
            ['Total', $report['routes']['total']],
            ['Active', $report['routes']['active']],
            ['Missing operator (critical)', $report['routes']['missing_operator']],
            ['Missing mode (critical)', $report['routes']['missing_mode']],
            ['Without variants (critical)', $report['routes']['without_variants']],
        ]);

        $this->renderSection('Route stops', [
            ['Total', $report['route_stops']['total']],
            ['Referencing missing stops (critical)', $report['route_stops']['referencing_missing_stops']],
            ['Duplicate variant+stop+seq (warning)', $report['route_stops']['duplicate_variant_stop_sequence']],
        ]);

        $this->renderSection('Schedules', [
            ['Total', $report['schedules']['total']],
            ['Within service window', $report['schedules']['within_service_window']],
            ['Window expired (info)', $report['schedules']['service_window_expired']],
            ['Frequency-based', $report['schedules']['frequency_based']],
            ['No stop times (critical)', $report['schedules']['no_stop_times']],
            ['Stop times missing times (warning)', $report['schedules']['stop_times_missing_times']],
        ]);

        $this->renderSection('Geometry', [
            ['Variants with geometry', $report['geometry']['variants_with_geometry']],
            ['Variants without geometry (warning)', $report['geometry']['variants_without_geometry']],
            ['Empty/single-point (critical)', $report['geometry']['empty_or_single_point']],
        ]);

        $this->newLine();
        $this->line("Summary — CRITICAL: {$s['critical_issues']} · WARNINGS: {$s['warnings']}");
    }

    private function renderSection(string $title, array $rows): void
    {
        $this->line("<options=bold>{$title}</>");
        foreach ($rows as [$label, $value]) {
            $this->line(sprintf('  %-42s %s', $label, $value));
        }
        $this->newLine();
    }
}
