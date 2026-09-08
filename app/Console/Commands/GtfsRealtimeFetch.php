<?php

namespace App\Console\Commands;

use App\Models\ServiceAlert;
use App\Services\Realtime\GtfsRealtimeService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Ingest a GTFS-Realtime ServiceAlert feed (when one is configured).
 *
 * Inert by default: GTFS_RT_URL must be set AND GTFS_RT_ENABLED=true.
 * No Egyptian agency currently publishes GTFS-RT (researched 2026-09-07);
 * this command exists so a future feed is a configuration change, not a
 * code change. Alerts are upserted idempotently on gtfs_alert_id.
 */
class GtfsRealtimeFetch extends Command
{
    protected $signature = 'gtfsrt:fetch {--dry-run : Parse and report without writing}';

    protected $description = 'Fetch and ingest a configured GTFS-Realtime ServiceAlert feed';

    public function handle(GtfsRealtimeService $service): int
    {
        if (!$service->enabled()) {
            $this->warn('GTFS-RT is not configured (set GTFS_RT_URL and GTFS_RT_ENABLED=true). Nothing to do.');

            return self::SUCCESS;
        }

        $alerts = $service->fetchAlerts();

        if ($alerts === []) {
            $this->warn('Feed reachable but contained no service alerts (or fetch failed — check logs).');

            return self::SUCCESS;
        }

        $this->info('Parsed ' . count($alerts) . ' alert(s).');

        if ($this->option('dry-run')) {
            foreach ($alerts as $alert) {
                $this->line('  - ' . ($alert['header_text'] ?? '(no header)'));
            }

            return self::SUCCESS;
        }

        $created = 0;
        $updated = 0;

        DB::transaction(function () use ($alerts, &$created, &$updated) {
            foreach ($alerts as $alert) {
                $header = $alert['header_text'] ?? 'Realtime service alert';
                if ($header === '' || $header === null) {
                    continue;
                }

                $start = isset($alert['active_period_start'])
                    ? Carbon::createFromTimestampUTC((int) $alert['active_period_start'])
                    : now();
                $end = isset($alert['active_period_end'])
                    ? Carbon::createFromTimestampUTC((int) $alert['active_period_end'])
                    : $start->copy()->endOfDay();

                $existing = ServiceAlert::withTrashed()
                    ->where('gtfs_alert_id', $alert['gtfs_alert_id'])
                    ->first();

                $payload = [
                    'gtfs_alert_id' => $alert['gtfs_alert_id'],
                    'header_text' => mb_substr($header, 0, 255),
                    'description_text' => $alert['description_text'] ?? null,
                    'severity' => 'moderate',
                    'consequence' => 'unknown_effect',
                    'active_period_start' => $start,
                    'active_period_end' => $end,
                ];

                if ($existing) {
                    $existing->update($payload);
                    $existing->restore();
                    $updated++;
                } else {
                    ServiceAlert::create($payload);
                    $created++;
                }
            }
        });

        $this->info("Ingested: {$created} created, {$updated} updated.");

        return self::SUCCESS;
    }
}
