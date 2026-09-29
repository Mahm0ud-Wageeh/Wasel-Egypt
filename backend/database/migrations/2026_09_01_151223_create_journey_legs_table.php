<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('journey_legs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journey_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->foreignId('route_variant_id')->nullable()->constrained()->onDelete('restrict')->onUpdate('cascade');
            $table->foreignId('transit_stop_from_id')->nullable()->constrained('transit_stops')->onDelete('set null')->onUpdate('cascade');
            $table->foreignId('transit_stop_to_id')->nullable()->constrained('transit_stops')->onDelete('set null')->onUpdate('cascade');
            $table->decimal('from_lat', 10, 8);
            $table->decimal('from_lng', 11, 8);
            $table->decimal('to_lat', 10, 8);
            $table->decimal('to_lng', 11, 8);
            $table->unsignedInteger('sequence');
            $table->timestamp('departure_time')->nullable();
            $table->timestamp('arrival_time')->nullable();
            $table->unsignedInteger('duration_sec');
            $table->unsignedInteger('distance_meters');
            $table->enum('mode', ['walking', 'metro', 'bus', 'minibus', 'microbus', 'rail']);
            $table->foreignId('agency_id')->nullable()->constrained('transit_operators')->onDelete('set null')->onUpdate('cascade');
            $table->decimal('leg_score', 5, 4);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['journey_id']);
            $table->index(['route_variant_id']);
            $table->index(['transit_stop_from_id']);
            $table->index(['transit_stop_to_id']);
            $table->index(['journey_id', 'sequence']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('journey_legs');
    }
};
