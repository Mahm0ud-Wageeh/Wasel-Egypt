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
        Schema::create('route_geometry', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_variant_id')->unique()->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->json('geometry'); // Array of [lat,lng] points
            $table->unsignedInteger('length_meters')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('route_geometry');
    }
};
