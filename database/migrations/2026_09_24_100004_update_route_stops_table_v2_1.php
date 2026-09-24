<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('route_stops', function (Blueprint $table) {
            if (!Schema::hasColumn('route_stops', 'is_timing_point')) {
                $table->boolean('is_timing_point')->default(false)->after('sequence');
            }
            if (!Schema::hasColumn('route_stops', 'travel_time_s')) {
                $table->integer('travel_time_s')->default(0)->after('is_timing_point');
            }
            if (!Schema::hasColumn('route_stops', 'distance_m')) {
                $table->integer('distance_m')->default(0)->after('travel_time_s');
            }
        });

        // Ensure unique index on (route_variant_id, sequence)
        try {
            Schema::table('route_stops', function (Blueprint $table) {
                $table->unique(['route_variant_id', 'sequence'], 'route_stops_variant_seq_unique');
            });
        } catch (\Throwable $e) {
            // Already exists or duplicate sequence handled
        }
    }

    public function down(): void
    {
        Schema::table('route_stops', function (Blueprint $table) {
            try {
                $table->dropUnique('route_stops_variant_seq_unique');
            } catch (\Throwable $e) {}

            $table->dropColumn(['is_timing_point', 'travel_time_s', 'distance_m']);
        });
    }
};
