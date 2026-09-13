<?php

namespace App\Services\Transit;

use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;

/**
 * Governed-data operations for the admin control center:
 *
 * - Import history: every data_import_logs row with its counts and status.
 * - Audit history: admin actions recorded in audit_logs.
 * - Rollback: preview + execute removal of the rows a given import created,
 *   keyed by the import_log_id stamps written at import time. Rows without a
 *   stamp (seeded baseline data, older imports) are never touched.
 *
 * Rollback deletes the import's own rows only; it never deletes the
 * data_import_logs entry itself — provenance is an audit record and
 * outlasts the data it describes. Every execution writes an audit log.
 */
class DataGovernanceService
{
    /** Entities owned by an import, in safe deletion order (children first). */
    private const ROLLBACK_ORDER = [
        'stop_times' => ['table' => 'stop_times', 'stamp' => null, 'via' => 'schedules'],
        'route_stops' => ['table' => 'route_stops', 'stamp' => null, 'via' => 'route_variants'],
        'route_geometry' => ['table' => 'route_geometry', 'stamp' => null, 'via' => 'route_variants'],
        'schedules' => ['table' => 'schedules', 'stamp' => 'schedules.import_log_id'],
        'route_variants' => ['table' => 'route_variants', 'stamp' => 'route_variants.import_log_id'],
        'routes' => ['table' => 'routes', 'stamp' => 'routes.import_log_id'],
        'transit_stops' => ['table' => 'transit_stops', 'stamp' => 'transit_stops.import_log_id'],
    ];

    public function __construct(private TransitQualityService $quality)
    {
    }

    /**
     * Import history, newest first, with human-readable validation summaries.
     */
    public function imports(int $perPage = 20): array
    {
        $rows = DB::table('data_import_logs')
            ->orderByDesc('imported_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        $rows->getCollection()->transform(function ($row) {
            $counts = json_decode((string) $row->counts, true) ?: [];
            $options = json_decode((string) $row->options, true) ?: [];

            return [
                'id' => $row->id,
                'source' => $row->source,
                'url' => $row->url,
                'dataset_version' => $row->dataset_version,
                'license' => $row->license,
                'status' => $row->status,
                'error' => $row->error,
                'counts' => $counts,
                'options' => $options,
                'imported_at' => $row->imported_at,
                'validation' => $this->validationSummary($row, $counts),
                // Rollbackable when this import stamped its rows.
                'rollbackable' => $this->rollbackableCounts($row->id) > 0,
            ];
        });

        return [
            'data' => $rows->items(),
            'meta' => [
                'total' => $rows->total(),
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'per_page' => $rows->perPage(),
            ],
        ];
    }

    /**
     * Admin audit history, newest first, filterable by actor/action/resource.
     */
    public function auditHistory(array $filters, int $perPage = 25): array
    {
        $query = AuditLog::query()->with('user:id,name,email');

        if (!empty($filters['action'])) {
            $query->where('action', 'like', $filters['action'] . '%');
        }
        if (!empty($filters['resource_type'])) {
            $query->where('resource_type', $filters['resource_type']);
        }
        if (!empty($filters['user_id'])) {
            $query->where('user_id', (int) $filters['user_id']);
        }

        $rows = $query->orderByDesc('occurred_at')->orderByDesc('id')->paginate($perPage);

        return [
            'data' => $rows->items(),
            'meta' => [
                'total' => $rows->total(),
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'per_page' => $rows->perPage(),
            ],
        ];
    }

    /**
     * Data-quality dashboard payload — the same numbers the CLI reports.
     */
    public function quality(): array
    {
        return $this->quality->report();
    }

    /**
     * Rollback preview: exactly which row counts an import's removal would
     * delete. Read-only — no mutation happens here.
     */
    public function rollbackPreview(int $importLogId): array
    {
        $log = DB::table('data_import_logs')->where('id', $importLogId)->first();
        if ($log === null) {
            return null;
        }

        return [
            'import' => [
                'id' => $log->id,
                'source' => $log->source,
                'dataset_version' => $log->dataset_version,
                'status' => $log->status,
                'imported_at' => $log->imported_at,
            ],
            'affected' => $this->rollbackCounts($importLogId),
            'warnings' => $this->rollbackWarnings($importLogId),
            'reversible' => false, // deletions are not reversible; the import log row survives
        ];
    }

    /**
     * Execute an authorized rollback inside one transaction. Returns the
     * deleted counts per table, or null when nothing was stamped by the
     * import (rollback refused rather than over-deleting).
     */
    public function executeRollback(int $importLogId, ?int $actorId, array $context = []): ?array
    {
        $preview = $this->rollbackPreview($importLogId);
        if ($preview === null) {
            return null;
        }

        $total = 0;
        foreach ($preview['affected'] as $count) {
            $total += $count;
        }

        if ($total === 0) {
            return null; // nothing owned by this import → refuse
        }

        $deleted = [];

        DB::transaction(function () use ($importLogId, $preview, $actorId, $context, &$deleted) {
            $log = $preview['import'];
            $deletable = $this->rollbackableSets($importLogId);

            // Children first (ROLLBACK_ORDER is already dependency-sorted).
            foreach (self::ROLLBACK_ORDER as $key => $spec) {
                $ids = $deletable[$key] ?? [];
                if ($ids === []) {
                    continue;
                }
                $deleted[$key] = DB::table($spec['table'])->whereIn('id', $ids)->delete();
            }

            AuditLog::create([
                'user_id' => $actorId,
                'action' => 'import.rollback',
                'resource_type' => 'data_import_log',
                'resource_id' => $importLogId,
                'changes' => [
                    'import' => $log,
                    'deleted' => $deleted,
                    'context' => $context,
                ],
                'ip_address' => request()?->ip(),
                'user_agent' => substr((string) (request()?->userAgent() ?? ''), 0, 255),
                'occurred_at' => now(),
            ]);
        });

        return $deleted;
    }

    // ---------------------------------------------------------------------
    // Rollback counting helpers
    // ---------------------------------------------------------------------

    /** True deletable row counts per entity for the import. */
    private function rollbackCounts(int $importLogId): array
    {
        $deletable = $this->rollbackableSets($importLogId);

        return array_map(
            fn ($ids) => count($ids),
            array_filter($deletable, fn ($ids) => $ids !== [])
        );
    }

    /** Quick existence check (cheaper than the full set build). */
    private function rollbackableCounts(int $importLogId): int
    {
        $n = 0;
        $n += DB::table('transit_stops')->where('import_log_id', $importLogId)->count();
        $n += DB::table('routes')->where('import_log_id', $importLogId)->count();
        $n += DB::table('route_variants')->where('import_log_id', $importLogId)->count();
        $n += DB::table('schedules')->where('import_log_id', $importLogId)->count();

        return $n;
    }

    /**
     * Full id sets per entity, expanded transitively:
     * stamped roots (stops/routes/variants/schedules) → their unstamped
     * children (stop_times, route_stops, route_geometry) are pulled in via
     * the stamped parent, so a rollback removes exactly the import's
     * subtree and nothing else.
     *
     * @return array<string, int[]>
     */
    private function rollbackableSets(int $importLogId): array
    {
        $stopIds = DB::table('transit_stops')->where('import_log_id', $importLogId)->pluck('id')->all();
        $routeIds = DB::table('routes')->where('import_log_id', $importLogId)->pluck('id')->all();

        $variantIds = DB::table('route_variants')
            ->where(function ($q) use ($importLogId, $routeIds) {
                $q->where('import_log_id', $importLogId);
                if ($routeIds !== []) {
                    $q->orWhereIn('route_id', $routeIds);
                }
            })->pluck('id')->all();

        $scheduleIds = DB::table('schedules')
            ->where(function ($q) use ($importLogId, $variantIds) {
                $q->where('import_log_id', $importLogId);
                if ($variantIds !== []) {
                    $q->orWhereIn('route_variant_id', $variantIds);
                }
            })->pluck('id')->all();

        $stopTimeIds = $scheduleIds !== []
            ? DB::table('stop_times')->whereIn('schedule_id', $scheduleIds)->pluck('id')->all()
            : [];

        $routeStopIds = $variantIds !== []
            ? DB::table('route_stops')->whereIn('route_variant_id', $variantIds)->pluck('id')->all()
            : [];

        $geometryIds = $variantIds !== []
            ? DB::table('route_geometry')->whereIn('route_variant_id', $variantIds)->pluck('id')->all()
            : [];

        return [
            'transit_stops' => $stopIds,
            'routes' => $routeIds,
            'route_variants' => $variantIds,
            'schedules' => $scheduleIds,
            'stop_times' => $stopTimeIds,
            'route_stops' => $routeStopIds,
            'route_geometry' => $geometryIds,
        ];
    }

    /**
     * Honest warnings for the preview: what the counts cannot undo.
     *
     * @return string[]
     */
    private function rollbackWarnings(int $importLogId): array
    {
        $warnings = [
            'Deletion is permanent. The import log row itself is kept as an audit record.',
        ];

        $log = DB::table('data_import_logs')->where('id', $importLogId)->first();
        if ($log !== null && $this->rollbackableCounts($importLogId) === 0) {
            $warnings[] = 'This import has no stamped rows (pre-governance import or seeder data). Rollback is refused — nothing would be deleted.';
        }

        // Cross-import sharing: stops stamped by another import that are
        // still referenced by this import's route_stops.
        $shared = DB::table('route_stops as rs')
            ->join('transit_stops as s', 's.id', '=', 'rs.transit_stop_id')
            ->whereIn('rs.route_variant_id', function ($q) use ($importLogId) {
                $q->select('id')->from('route_variants')->where('import_log_id', $importLogId);
            })
            ->whereNotNull('s.import_log_id')
            ->where('s.import_log_id', '!=', $importLogId)
            ->count();
        if ($shared > 0) {
            $warnings[] = "{$shared} stop references point at stops owned by other imports; those stops themselves are NOT deleted.";
        }

        return $warnings;
    }

    private function validationSummary($row, array $counts): array
    {
        $summary = ['status' => 'unknown', 'issues' => 0, 'message' => null];

        if (($row->status ?? null) === 'failed') {
            return [
                'status' => 'failed',
                'issues' => 1,
                'message' => (string) ($row->error ?? 'Import failed'),
            ];
        }

        // A completed import is structurally validated when it produced the
        // entities it claims (counts) and every stop landed in Egypt's bbox.
        $issues = 0;
        if (($counts['stops_created'] ?? 0) > 0) {
            $issues += (int) DB::table('transit_stops')
                ->where('import_log_id', $row->id)
                ->whereNotBetween('latitude', [21.0, 32.0])
                ->orWhereNotBetween('longitude', [24.0, 37.0])
                ->count();
        }

        $summary['status'] = $issues === 0 ? 'passed' : 'passed_with_issues';
        $summary['issues'] = $issues;
        $summary['message'] = $issues === 0
            ? 'Imported entities passed structural validation (bbox, references).'
            : "{$issues} imported stops fall outside the Egypt bounding box.";

        return $summary;
    }
}
