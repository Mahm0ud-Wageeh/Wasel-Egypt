<?php

namespace App\Services\Transit;

use Illuminate\Support\Facades\DB;

/**
 * Data-quality indicators computed live from the real database — the single
 * implementation shared by the `transit:quality-report` CLI and the admin
 * data-governance API. No fabricated numbers: every metric is a count or
 * date derived from the tables themselves.
 */
class TransitQualityService
{
    /**
     * Full report: network totals, structural integrity, geometry coverage,
     * schedule health, fare honesty split, and import freshness.
     */
    public function report(): array
    {
        $report = [
            'generated_at' => now('Africa/Cairo')->toIso8601String(),
            'stops' => $this->stopChecks(),
            'routes' => $this->routeChecks(),
            'route_stops' => $this->routeStopChecks(),
            'schedules' => $this->scheduleChecks(),
            'geometry' => $this->geometryChecks(),
            'fares' => $this->fareChecks(),
            'imports' => $this->importChecks(),
        ];

        $report['summary'] = $this->summarize($report);

        return $report;
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
            // Counted in PHP (json arrays) so the metric works on both
            // MySQL and SQLite (no JSON_LENGTH dependency).
            'empty_or_single_point' => DB::table('route_geometry')->get(['geometry'])
                ->filter(fn ($row) => $this->geometryPointCount($row->geometry) < 2)
                ->count(),
            'suspicious_length' => $this->suspiciousGeometry(),
        ];
    }

    /** @param string|null $json geometry JSON column */
    private function geometryPointCount(?string $json): int
    {
        $decoded = json_decode((string) $json, true);

        return is_array($decoded) ? count($decoded) : 0;
    }

    /**
     * Geometries whose stored length disagrees wildly with the stop-to-stop
     * straight-line span of the variant (ratio > 4 or < 0.25) — a real
     * indicator of corrupted/leaked polylines, computed from stored data.
     * Two bulk queries (all geometries, all variant stops) instead of one
     * query per variant — the dashboard must answer in milliseconds.
     */
    private function suspiciousGeometry(): int
    {
        $lengths = DB::table('route_geometry')
            ->pluck('length_meters', 'route_variant_id');

        if ($lengths->isEmpty()) {
            return 0;
        }

        $spans = [];
        foreach (DB::table('route_stops as rs')
            ->join('transit_stops as s', 's.id', '=', 'rs.transit_stop_id')
            ->whereIn('rs.route_variant_id', $lengths->keys())
            ->orderBy('rs.route_variant_id')
            ->orderBy('rs.sequence')
            ->get(['rs.route_variant_id', 's.latitude', 's.longitude']) as $row) {
            $spans[$row->route_variant_id][] = [$row->latitude, $row->longitude];
        }

        $suspicious = 0;
        foreach ($spans as $variantId => $coords) {
            $lengthMeters = $lengths[$variantId];
            if (count($coords) < 2 || $lengthMeters === null) {
                continue;
            }

            // Sum straight-line hops between consecutive stops: a sane
            // lower bound for the polyline, no detours assumed.
            $span = 0.0;
            for ($i = 1; $i < count($coords); $i++) {
                $span += $this->haversine(
                    $coords[$i - 1][0], $coords[$i - 1][1],
                    $coords[$i][0], $coords[$i][1]
                );
            }
            if ($span < 100) {
                continue; // too short to judge
            }
            $ratio = $lengthMeters / $span;
            if ($ratio > 4 || $ratio < 0.25) {
                $suspicious++;
            }
        }

        return $suspicious;
    }

    private function fareChecks(): array
    {
        return [
            'total' => DB::table('fares')->count(),
            'real' => DB::table('fares')->where('data_status', 'real')->count(),
            'demo_estimated' => DB::table('fares')->where('data_status', 'demo_estimated')->count(),
            'unknown_pairs_note' => 'Pairs with no verified fare are represented by the absence of a row — by design, never a placeholder 0 EGP entry.',
        ];
    }

    private function importChecks(): array
    {
        $latest = DB::table('data_import_logs')->orderByDesc('imported_at')->first();

        return [
            'logged_imports' => DB::table('data_import_logs')->count(),
            'failed_imports' => DB::table('data_import_logs')->where('status', 'failed')->count(),
            'last_import_at' => $latest?->imported_at,
            'last_import_source' => $latest?->source,
            'stale_datasets' => DB::table('data_import_logs')
                ->where('status', 'completed')
                ->where('imported_at', '<', now()->subMonths(6))
                ->count(),
            'latest' => DB::table('data_import_logs')
                ->orderByDesc('imported_at')->limit(3)
                ->get(['source', 'dataset_version', 'license', 'status', 'imported_at'])
                ->all(),
        ];
    }

    private function summarize(array $report): array
    {
        $critical = 0;

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
            + $report['geometry']['variants_without_geometry']
            + $report['geometry']['suspicious_length'];

        return [
            'critical_issues' => $critical,
            'warnings' => $warnings,
            'note' => 'service_window_expired counts schedules whose documented window has passed (demo windows included) — informational, not data corruption',
        ];
    }

    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $rad = pi() / 180;
        $dLat = ($lat2 - $lat1) * $rad;
        $dLon = ($lon2 - $lon1) * $rad;
        $a = sin($dLat / 2) ** 2 + cos($lat1 * $rad) * cos($lat2 * $rad) * sin($dLon / 2) ** 2;

        return 6371000 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
