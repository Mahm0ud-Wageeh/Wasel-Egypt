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
        Schema::create('active_journeys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journey_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();
            $table->unsignedInteger('current_leg_index')->default(0);
            $table->decimal('current_progress_percent', 5, 2)->default(0.00);
            $table->enum('status', ['active', 'completed', 'cancelled', 'deviated', 'rerouted'])->default('active');
            $table->timestamp('deviation_detected_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id']);
            $table->index(['status']);
            $table->index(['journey_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('active_journeys');
    }
};
