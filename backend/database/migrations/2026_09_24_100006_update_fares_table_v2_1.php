<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fares', function (Blueprint $table) {
            if (!Schema::hasColumn('fares', 'min_stations')) {
                $table->integer('min_stations')->nullable()->after('transit_mode_id');
            }
            if (!Schema::hasColumn('fares', 'max_stations')) {
                $table->integer('max_stations')->nullable()->after('min_stations');
            }
            if (!Schema::hasColumn('fares', 'effective_date')) {
                $table->date('effective_date')->nullable()->after('currency');
            }
            if (!Schema::hasColumn('fares', 'end_date')) {
                $table->date('end_date')->nullable()->after('effective_date');
            }
            if (!Schema::hasColumn('fares', 'source_label')) {
                $table->string('source_label', 255)->nullable()->after('source');
            }
            if (!Schema::hasColumn('fares', 'is_estimate')) {
                $table->boolean('is_estimate')->default(false)->after('source_label');
            }
        });

        // Backfill dates and station tiers from existing columns
        if (Schema::hasColumn('fares', 'effective_from')) {
            DB::statement("UPDATE fares SET effective_date = effective_from WHERE effective_date IS NULL AND effective_from IS NOT NULL");
        }
        if (Schema::hasColumn('fares', 'effective_until')) {
            DB::statement("UPDATE fares SET end_date = effective_until WHERE end_date IS NULL AND effective_until IS NOT NULL");
        }

        // Metro station tiers
        DB::table('fares')->where('tier', 'Tier 1')->update(['min_stations' => 1, 'max_stations' => 9]);
        DB::table('fares')->where('tier', 'Tier 2')->update(['min_stations' => 10, 'max_stations' => 16]);
        DB::table('fares')->where('tier', 'Tier 3')->update(['min_stations' => 17, 'max_stations' => 23]);
        DB::table('fares')->where('tier', 'Tier 4')->update(['min_stations' => 24, 'max_stations' => 99]);

        // Estimated flag
        DB::table('fares')
            ->where(function($q) {
                $q->where('confidence', 'estimated')
                  ->orWhere('data_status', 'demo_estimated');
            })
            ->update(['is_estimate' => true]);

        // Populate source_label
        DB::statement("UPDATE fares SET source_label = label WHERE source_label IS NULL AND label IS NOT NULL");
    }

    public function down(): void
    {
        Schema::table('fares', function (Blueprint $table) {
            $table->dropColumn([
                'min_stations',
                'max_stations',
                'effective_date',
                'end_date',
                'source_label',
                'is_estimate',
            ]);
        });
    }
};
