<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. journeys
        Schema::table('journeys', function (Blueprint $table) {
            if (!Schema::hasColumn('journeys', 'origin_stop_id')) {
                $table->unsignedBigInteger('origin_stop_id')->nullable()->after('user_id');
                $table->foreign('origin_stop_id')->references('id')->on('transit_stops')->onDelete('set null');
            }
            if (!Schema::hasColumn('journeys', 'dest_stop_id')) {
                $table->unsignedBigInteger('dest_stop_id')->nullable()->after('origin_stop_id');
                $table->foreign('dest_stop_id')->references('id')->on('transit_stops')->onDelete('set null');
            }
            if (!Schema::hasColumn('journeys', 'dest_lat')) {
                $table->decimal('dest_lat', 10, 7)->nullable()->after('origin_lng');
            }
            if (!Schema::hasColumn('journeys', 'dest_lng')) {
                $table->decimal('dest_lng', 10, 7)->nullable()->after('dest_lat');
            }
            if (!Schema::hasColumn('journeys', 'started_at')) {
                $table->timestamp('started_at')->nullable()->after('destination_lng');
            }
            if (!Schema::hasColumn('journeys', 'completed_at')) {
                $table->timestamp('completed_at')->nullable()->after('started_at');
            }
            if (!Schema::hasColumn('journeys', 'total_fare')) {
                $table->decimal('total_fare', 10, 2)->default(0)->after('status');
            }
        });

        // 2. journey_legs
        Schema::table('journey_legs', function (Blueprint $table) {
            if (!Schema::hasColumn('journey_legs', 'leg_type')) {
                $table->enum('leg_type', ['transit', 'walk'])->default('transit')->after('sequence');
            }
            if (!Schema::hasColumn('journey_legs', 'transit_mode_id')) {
                $table->unsignedBigInteger('transit_mode_id')->nullable()->after('leg_type');
                $table->foreign('transit_mode_id')->references('id')->on('transit_modes')->onDelete('set null');
            }
            if (!Schema::hasColumn('journey_legs', 'from_stop_id')) {
                $table->unsignedBigInteger('from_stop_id')->nullable()->after('route_variant_id');
                $table->foreign('from_stop_id')->references('id')->on('transit_stops')->onDelete('set null');
            }
            if (!Schema::hasColumn('journey_legs', 'to_stop_id')) {
                $table->unsignedBigInteger('to_stop_id')->nullable()->after('from_stop_id');
                $table->foreign('to_stop_id')->references('id')->on('transit_stops')->onDelete('set null');
            }
            if (!Schema::hasColumn('journey_legs', 'distance_m')) {
                $table->integer('distance_m')->default(0)->after('to_lng');
            }
            if (!Schema::hasColumn('journey_legs', 'fare')) {
                $table->decimal('fare', 10, 2)->default(0)->after('distance_m');
            }
            if (!Schema::hasColumn('journey_legs', 'boarding_at')) {
                $table->timestamp('boarding_at')->nullable()->after('fare');
            }
            if (!Schema::hasColumn('journey_legs', 'alighting_at')) {
                $table->timestamp('alighting_at')->nullable()->after('boarding_at');
            }
        });

        // Migrate existing journey_legs data
        if (Schema::hasColumn('journey_legs', 'mode')) {
            DB::statement("UPDATE journey_legs SET leg_type = CASE WHEN mode = 'walking' THEN 'walk' ELSE 'transit' END");
        }
        if (Schema::hasColumn('journey_legs', 'transit_stop_from_id')) {
            DB::statement("UPDATE journey_legs SET from_stop_id = transit_stop_from_id WHERE from_stop_id IS NULL AND transit_stop_from_id IS NOT NULL");
        }
        if (Schema::hasColumn('journey_legs', 'transit_stop_to_id')) {
            DB::statement("UPDATE journey_legs SET to_stop_id = transit_stop_to_id WHERE to_stop_id IS NULL AND transit_stop_to_id IS NOT NULL");
        }
        if (Schema::hasColumn('journey_legs', 'distance_meters')) {
            DB::statement("UPDATE journey_legs SET distance_m = distance_meters WHERE distance_m = 0 AND distance_meters IS NOT NULL");
        }
        if (Schema::hasColumn('journey_legs', 'departure_time')) {
            DB::statement("UPDATE journey_legs SET boarding_at = departure_time WHERE boarding_at IS NULL AND departure_time IS NOT NULL");
        }
        if (Schema::hasColumn('journey_legs', 'arrival_time')) {
            DB::statement("UPDATE journey_legs SET alighting_at = arrival_time WHERE alighting_at IS NULL AND arrival_time IS NOT NULL");
        }

        // Backfill transit_mode_id based on mode name
        $modes = DB::table('transit_modes')->pluck('id', 'name');
        foreach ($modes as $name => $id) {
            DB::table('journey_legs')
                ->where('mode', $name)
                ->whereNull('transit_mode_id')
                ->update(['transit_mode_id' => $id]);
        }
    }

    public function down(): void
    {
        Schema::table('journey_legs', function (Blueprint $table) {
            $table->dropForeign(['transit_mode_id']);
            $table->dropForeign(['from_stop_id']);
            $table->dropForeign(['to_stop_id']);
            $table->dropColumn([
                'leg_type',
                'transit_mode_id',
                'from_stop_id',
                'to_stop_id',
                'distance_m',
                'fare',
                'boarding_at',
                'alighting_at',
            ]);
        });

        Schema::table('journeys', function (Blueprint $table) {
            $table->dropForeign(['origin_stop_id']);
            $table->dropForeign(['dest_stop_id']);
            $table->dropColumn([
                'origin_stop_id',
                'dest_stop_id',
                'started_at',
                'completed_at',
                'total_fare',
            ]);
        });
    }
};
