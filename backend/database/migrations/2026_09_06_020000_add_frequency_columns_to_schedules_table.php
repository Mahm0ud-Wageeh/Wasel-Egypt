<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds GTFS frequencies.txt support to schedules.
 *
 * Frequency-based feeds (e.g. the Transport for Cairo feed) define repeating
 * service windows instead of exact timetables: every headway_seconds a vehicle
 * departs between start_time and end_time, and stop_times.txt holds the
 * template times of the first vehicle only.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->json('frequency_windows')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('schedules', function (Blueprint $table) {
            $table->dropColumn('frequency_windows');
        });
    }
};
