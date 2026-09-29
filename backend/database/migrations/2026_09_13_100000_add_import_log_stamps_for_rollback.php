<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Import-provenance stamps for rollback: every row created by a governed
 * import records which data_import_logs entry produced it, so an admin can
 * preview and execute a targeted rollback of that import without touching
 * rows belonging to other sources (seeded baseline data included).
 *
 * FK is intentionally omitted: data_import_logs rows are an audit record,
 * and we never delete them as part of a data rollback.
 */
return new class extends Migration
{
    public function up(): void
    {
        $stamped = [
            'transit_stops' => 'gtfs_stop_id',
            'routes' => 'gtfs_route_id',
            'route_variants' => 'gtfs_trip_id',
            'schedules' => 'gtfs_trip_id',
        ];

        foreach ($stamped as $table => $comment) {
            if (!Schema::hasColumn($table, 'import_log_id')) {
                Schema::table($table, function (Blueprint $t) use ($comment) {
                    $t->unsignedBigInteger('import_log_id')->nullable()->comment("origin data_import_logs.id ($comment importer)");
                });
            }
        }

        foreach ($stamped as $table => $_) {
            Schema::table($table, function (Blueprint $t) {
                $t->index(['import_log_id'], $t->getTable().'_import_log_id_index');
            });
        }
    }

    public function down(): void
    {
        foreach (['transit_stops', 'routes', 'route_variants', 'schedules'] as $table) {
            if (Schema::hasColumn($table, 'import_log_id')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropIndex($t->getTable().'_import_log_id_index');
                    $t->dropColumn('import_log_id');
                });
            }
        }
    }
};
