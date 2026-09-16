<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add leg_steps JSON to journey_legs for turn-by-turn walking steps.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journey_legs', function (Blueprint $table) {
            $table->json('leg_steps')->nullable()->after('geometry_source');
        });
    }

    public function down(): void
    {
        Schema::table('journey_legs', function (Blueprint $table) {
            $table->dropColumn('leg_steps');
        });
    }
};
