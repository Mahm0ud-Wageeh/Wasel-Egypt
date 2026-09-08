<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Provenance log for every external data import (GTFS feeds, OSM extracts).
 * Records where the data came from, under which license, which dataset
 * version was used, what was imported, and which normalization options were
 * applied — so no dataset can be silently passed off as something it is not.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_import_logs', function (Blueprint $table) {
            $table->id();
            $table->string('source', 100);            // e.g. mobilitydb:mdb-3355, osm:metro
            $table->string('url', 500)->nullable();   // dataset download URL
            $table->string('dataset_version', 100)->nullable();
            $table->string('license', 100)->nullable();  // e.g. CC-BY-NC-SA-2.0, ODbL
            $table->json('options')->nullable();      // normalization applied (date window, mode map, ...)
            $table->json('counts')->nullable();       // imported row counts per entity
            $table->string('status', 20)->default('completed'); // completed | failed
            $table->text('error')->nullable();
            $table->timestamp('imported_at')->nullable();
            $table->timestamps();

            $table->index(['source']);
            $table->index(['imported_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_import_logs');
    }
};
