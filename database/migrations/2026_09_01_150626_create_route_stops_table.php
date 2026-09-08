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
        Schema::create('route_stops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_variant_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->foreignId('transit_stop_id')->nullable()->constrained()->onDelete('set null')->onUpdate('cascade');
            $table->unsignedInteger('sequence');
            $table->unsignedTinyInteger('pickup_type')->default(0);
            $table->unsignedTinyInteger('drop_off_type')->default(0);
            $table->decimal('distance_from_prev', 10, 3)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['route_variant_id', 'sequence']);
            $table->unique(['route_variant_id', 'transit_stop_id']);
            $table->index(['route_variant_id']);
            $table->index(['transit_stop_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('route_stops');
    }
};
