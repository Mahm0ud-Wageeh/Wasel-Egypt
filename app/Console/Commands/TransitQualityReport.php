<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

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

    public function handle(): int
    {
        $report = [
            'generated_at' => now()->toIso8601String(),
            'stops' => $this->stopChecks(),
            'routes' => $this->routeChecks(),
            'route_stops' => $this->routeStopChecks(),
            'schedules' => $this->scheduleChecks(),
            'geometry' => $this->geometryChecks(),
            'imports' => $this->importChecks(),
        ];

        $report['summary'] = $this->summarize($report);

        if ($this->option('json')) {
            $this->line(json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            return self::SUCCESS;
        }

        $this->renderConsole($report);

        return self::SUCCESS;
    }

    private function stopChecks(): array
    {
        $total = DB::table('transit_stops')->count();

        return [
            'total' => $total,
            'valid_coordinates' => DB::table('transit_stops')
                ->whereBetween('latitude', [21.0, 32.0])
                ->whereBetween('longitude', [24.0, 37.0])->count(),
            'outside_egypt_bbox' => DB::table('transit_stops')
                ->whereNotBetween('latitude', [21.0, 32.0])
                ->orWhereNotBetween('longitude', [24.0, 37.0])->count(),
            'missing_name' => DB::table('transit_stops')->whereNull('name')->orWhere('name', '')->count(),
            'duplicate_names_same_coords' => DB::table('transit_stops')
                ->select('name', 'latitude', 'longitude', DB::raw('COUNT(*) as c'))
                ->groupBy('name', 'latitude', 'longitude')
                ->havingRaw('COUNT(*) > 1')->get()->count(),
            'no_area_assigned' => DB::table('transit_stops')->whereNull('area_id')->count(),
            'wheelchair_accessible' => DB::table('transit_stops')->where('wheelchair_accessible', 1)->count(),
        ];
    }

    private function routeChecks(): array
    {
        return [
            'total' => DB::table('routes')->count(),
            'active' => DB::table('routes')->where('active', true)->count(),
            'inactive' => DB::table('routes')->where('active', false)->count(),
            'missing_operator' => DB::table('routes')->whereNull('transit_operator_id')->count(),
            'missing_mode' => DB::table('routes')->whereNull('transit_mode_id')->count(),
            'without_variants' => DB::table('routes as r')
                ->whereNotExists(fn ($q) => $q->select(DB::raw(1))
                    ->from('route_variants as v')->whereColumn('v.route_id', 'r.id'))->count(),
            'orphaned_variants' => DB::table('route_variants as v')
                ->whereNotExists(fn ($q) => $q->select(DB::raw(1))
                    ->from('routes as r')->whereColumn('r.id', 'v.route_id'))->count(),
        ];
    }

    private function routeStopChecks(): array
    {
        return [
            'total' => DB::table('route_stops')->count(),
            'duplicate_variant_stop_sequence' => DB::table('route_stops')
                ->select('route_variant_id', 'transit_stop_id', 'sequence', DB::raw('COUNT(*) as c'))
                ->groupBy('route_variant_id', 'transit_stop_id', 'sequence')
                ->havingRaw('COUNT(*) > 1')->get()->count(),
            'referencing_missing_stops' => DB::table('route_stops as rs')
                ->whereNotExists(fn ($q) => $q->select(DB::raw(1))
                    ->from('transit_stops as s')->whereColumn('s.id', 'rs.transit_stop_id'))->count(),
            'variants_with_single_stop' => DB::table('route_stops')
                ->select('route_variant_id', DB::raw('COUNT(*) as c'))
                ->groupBy('route_variant_id')->havingRaw('COUNT(*) < 2')->get()->count(),
        ];
    }

    private function scheduleChecks(): array
    {
        $today = now()->toDateString();

        return [
            'total' => DB::table('schedules')->count(),
            'active' => DB::table('schedules')->where('is_active', true)->count(),
            'service_window_expired' => DB::table('schedules')
                ->whereNotNull('end_date')->where('end_date', '<', $today)->count(),
            'within_service_window' => DB::table('schedules')
                ->where('start_date', '<=', $today)
                ->where(fn ($q) => $q->whereNull('end_date')->orWhere('end_date', '>=', $today))->count(),
            'no_stop_times' => DB::table('schedules as s')
                ->whereNotExists(fn ($q) => $q->select(DB::raw(1))
                    ->from('stop_times as st')->whereColumn('st.schedule_id', 's.id'))->count(),
            'frequency_based' => DB::table('schedules')->whereNotNull('frequency_windows')->count(),
            'total_stop_times' => DB::table('stop_times')->count(),
            'stop_times_missing_times' => DB::table('stop_times')
                ->whereNull('arrival_time')->orWhereNull('departure_time')->count(),
        ];
    }

    private function geometryChecks(): array
    {
        $variants = DB::table('route_variants')->count();
        $withGeometry = DB::table('route_geometry')->count();

        return [
            'variants_total' => $variants,
            'variants_with_geometry' => $withGeometry,
            'variants_without_geometry' => $variants - $withGeometry,
            'empty_or_single_point' => DB::table('route_geometry')
                ->whereRaw('JSON_LENGTH(geometry) < 2')->count(),
        ];
    }

    private function importChecks(): array
    {
        return [
            'logged_imports' => DB::table('data_import_logs')->count(),
            'latest' => DB::table('data_import_logs')
                ->orderByDesc('imported_at')->limit(3)
                ->get(['source', 'dataset_version', 'license', 'status', 'imported_at'])
                ->all(),
        ];
    }

    private function summarize(array $report): array
    {
        $critical = 0;
        $warnings = 0;

        foreach (['outside_egypt_bbox', 'missing_name', 'no_area_assigned'] as $k) {
            $critical += $report['stops'][$k];
        }
        foreach (['missing_operator', 'missing_mode', 'without_variants', 'orphaned_variants'] as $k) {
            $critical += $report['routes'][$k];
        }
        $critical += $report['route_stops']['referencing_missing_stops'];
        $critical += $report['schedules']['no_stop_times'];
        $critical += $report['geometry']['empty_or_single_point'];

        $warnings = $report['stops']['duplicate_names_same_coords']
            + $report['route_stops']['duplicate_variant_stop_sequence']
            + $report['route_stops']['variants_with_single_stop']
            + $report['schedules']['service_window_expired']
            + $report['schedules']['stop_times_missing_times']
            + $report['geometry']['variants_without_geometry'];

        return [
            'critical_issues' => $critical,
            'warnings' => $warnings,
            'note' => 'service_window_expired counts schedules whose documented window has passed (demo windows included) — informational, not data corruption',
        ];
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
