<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. schedules
        Schema::table('schedules', function (Blueprint $table) {
            if (!Schema::hasColumn('schedules', 'day_type')) {
                $table->enum('day_type', ['weekday', 'friday', 'saturday', 'holiday'])->default('weekday')->after('route_variant_id');
            }
            if (!Schema::hasColumn('schedules', 'first_departure')) {
                $table->time('first_departure')->nullable()->after('day_type');
            }
            if (!Schema::hasColumn('schedules', 'last_departure')) {
                $table->time('last_departure')->nullable()->after('first_departure');
            }
            if (!Schema::hasColumn('schedules', 'headway_peak_min')) {
                $table->integer('headway_peak_min')->nullable()->after('last_departure');
            }
            if (!Schema::hasColumn('schedules', 'headway_offpeak_min')) {
                $table->integer('headway_offpeak_min')->nullable()->after('headway_peak_min');
            }
            if (!Schema::hasColumn('schedules', 'is_timetable_based')) {
                $table->boolean('is_timetable_based')->default(false)->after('headway_offpeak_min');
            }
            if (!Schema::hasColumn('schedules', 'active')) {
                $table->boolean('active')->default(true)->after('is_timetable_based');
            }
        });

        // Copy is_active to active
        if (Schema::hasColumn('schedules', 'is_active')) {
            DB::statement("UPDATE schedules SET active = is_active WHERE is_active IS NOT NULL");
        }

        // 2. schedule_exceptions
        if (!Schema::hasTable('schedule_exceptions')) {
            Schema::create('schedule_exceptions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('schedule_id');
                $table->date('exception_date');
                $table->enum('kind', ['closed', 'modified'])->default('modified');
                $table->integer('headway_override_min')->nullable();
                $table->string('note', 255)->nullable();
                $table->timestamps();

                $table->foreign('schedule_id')->references('id')->on('schedules')->onDelete('cascade');
            });
        }

        // 3. stop_times
        Schema::table('stop_times', function (Blueprint $table) {
            if (!Schema::hasColumn('stop_times', 'trip_no')) {
                $table->integer('trip_no')->default(1)->after('schedule_id');
            }
            if (!Schema::hasColumn('stop_times', 'route_stop_id')) {
                $table->unsignedBigInteger('route_stop_id')->nullable()->after('trip_no');
            }
        });

        // Add hot-path index on stop_times (route_stop_id, arrival_time)
        try {
            Schema::table('stop_times', function (Blueprint $table) {
                $table->index(['route_stop_id', 'arrival_time'], 'stop_times_route_stop_arrival_idx');
            });
        } catch (\Throwable $e) {}
    }

    public function down(): void
    {
        try {
            Schema::table('stop_times', function (Blueprint $table) {
                $table->dropIndex('stop_times_route_stop_arrival_idx');
                $table->dropColumn(['trip_no', 'route_stop_id']);
            });
        } catch (\Throwable $e) {}

        Schema::dropIfExists('schedule_exceptions');

        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn([
                'day_type',
                'first_departure',
                'last_departure',
                'headway_peak_min',
                'headway_offpeak_min',
                'is_timetable_based',
                'active',
            ]);
        });
    }
};
