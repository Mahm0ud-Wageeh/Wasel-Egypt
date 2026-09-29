<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Road-aware leg geometry on saved journeys.
 *
 * The planner now produces per-leg geometry: road-following polylines for
 * walking legs (OSRM foot profile) and variant polylines for transit legs
 * (route_geometry). Persisting it keeps active-journey payloads complete —
 * the map renders the exact route without extra lookups.
 *
 * Legacy journeys saved before this column have NULL geometry: the map
 * renders straight stop-to-stop lines for those legs (documented fallback).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journey_legs', function (Blueprint $table) {
            $table->json('geometry')->nullable()->after('distance_meters');
            $table->string('geometry_source', 30)->nullable()->after('geometry');
        });
    }

    public function down(): void
    {
        Schema::table('journey_legs', function (Blueprint $table) {
            $table->dropColumn(['geometry', 'geometry_source']);
        });
    }
};
