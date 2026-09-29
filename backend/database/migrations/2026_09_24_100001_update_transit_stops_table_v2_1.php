<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transit_stops', function (Blueprint $table) {
            if (!Schema::hasColumn('transit_stops', 'name_ar')) {
                $table->string('name_ar', 150)->nullable()->after('name');
            }
            if (!Schema::hasColumn('transit_stops', 'parent_station_id')) {
                $table->unsignedBigInteger('parent_station_id')->nullable()->after('location_accuracy');
                $table->foreign('parent_station_id')->references('id')->on('transit_stops')->onDelete('set null');
                $table->index('parent_station_id');
            }
            if (!Schema::hasColumn('transit_stops', 'is_interchange')) {
                $table->boolean('is_interchange')->default(false)->after('parent_station_id');
            }
            if (!Schema::hasColumn('transit_stops', 'wheelchair_boarding')) {
                $table->tinyInteger('wheelchair_boarding')->default(0)->after('is_interchange');
            }
            if (!Schema::hasColumn('transit_stops', 'active')) {
                $table->boolean('active')->default(true)->after('wheelchair_boarding');
            }
            if (!Schema::hasColumn('transit_stops', 'source')) {
                $table->string('source', 100)->nullable()->default('gtfs_mobility_db')->after('active');
            }
        });

        // Copy wheelchair_accessible to wheelchair_boarding if column existed
        if (Schema::hasColumn('transit_stops', 'wheelchair_accessible')) {
            DB::statement("UPDATE transit_stops SET wheelchair_boarding = CASE WHEN wheelchair_accessible = 1 THEN 1 ELSE 0 END WHERE wheelchair_boarding = 0");
        }

        // Add index on lat/lng if not present
        Schema::table('transit_stops', function (Blueprint $table) {
            $table->index(['latitude', 'longitude'], 'transit_stops_lat_lng_idx');
        });
    }

    public function down(): void
    {
        Schema::table('transit_stops', function (Blueprint $table) {
            if (Schema::hasColumn('transit_stops', 'parent_station_id')) {
                $table->dropForeign(['parent_station_id']);
                $table->dropIndex(['parent_station_id']);
            }
            $table->dropIndex('transit_stops_lat_lng_idx');
            $table->dropColumn([
                'name_ar',
                'parent_station_id',
                'is_interchange',
                'wheelchair_boarding',
                'active',
                'source',
            ]);
        });
    }
};
