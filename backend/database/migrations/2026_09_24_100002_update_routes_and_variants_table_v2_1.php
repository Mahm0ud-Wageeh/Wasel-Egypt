<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. routes
        Schema::table('routes', function (Blueprint $table) {
            if (!Schema::hasColumn('routes', 'operator_id')) {
                $table->unsignedBigInteger('operator_id')->nullable()->after('transit_mode_id');
            }
            if (!Schema::hasColumn('routes', 'long_name_ar')) {
                $table->string('long_name_ar', 255)->nullable()->after('long_name');
            }
            if (!Schema::hasColumn('routes', 'source')) {
                $table->string('source', 100)->default('national_transit_pack:real_v2')->after('active');
            }
        });

        // Copy transit_operator_id to operator_id
        if (Schema::hasColumn('routes', 'transit_operator_id')) {
            DB::statement("UPDATE routes SET operator_id = transit_operator_id WHERE operator_id IS NULL AND transit_operator_id IS NOT NULL");
        }

        // 2. route_variants
        Schema::table('route_variants', function (Blueprint $table) {
            if (!Schema::hasColumn('route_variants', 'name_ar')) {
                $table->string('name_ar', 150)->nullable()->after('name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('routes', function (Blueprint $table) {
            $table->dropColumn(['operator_id', 'long_name_ar', 'source']);
        });

        Schema::table('route_variants', function (Blueprint $table) {
            $table->dropColumn(['name_ar']);
        });
    }
};
