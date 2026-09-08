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
        Schema::create('journey_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('active_journey_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->timestamp('recorded_at')->useCurrent();
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->decimal('speed_kph', 5, 2)->nullable();
            $table->decimal('bearing_deg', 6, 2)->nullable();
            $table->decimal('accuracy_meters', 6, 2)->nullable();
            $table->foreignId('nearest_stop_id')->nullable()->constrained('transit_stops')->onDelete('set null')->onUpdate('cascade');
            $table->decimal('nearest_stop_distance_meters', 8, 3)->nullable();
            $table->boolean('is_stop_event')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['active_journey_id']);
            $table->index(['recorded_at']);
            $table->index(['nearest_stop_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('journey_progress');
    }
};
