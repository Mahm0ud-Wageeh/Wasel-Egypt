<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Guarantees import idempotency: re-importing a GTFS feed must not create
 * duplicate stop positions on the same variant. (variant, stop, sequence)
 * is a true duplicate triple — a loop route revisiting a stop uses different
 * sequence values and remains representable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('route_stops', function (Blueprint $table) {
            $table->unique(['route_variant_id', 'transit_stop_id', 'sequence'], 'route_stops_variant_stop_sequence_unique');
        });
    }

    public function down(): void
    {
        Schema::table('route_stops', function (Blueprint $table) {
            $table->dropUnique('route_stops_variant_stop_sequence_unique');
        });
    }
};
