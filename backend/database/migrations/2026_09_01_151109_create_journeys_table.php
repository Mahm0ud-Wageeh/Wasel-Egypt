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
        Schema::create('journeys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->decimal('origin_lat', 10, 8);
            $table->decimal('origin_lng', 11, 8);
            $table->decimal('destination_lat', 10, 8);
            $table->decimal('destination_lng', 11, 8);
            $table->timestamp('requested_at')->useCurrent();
            $table->unsignedInteger('total_duration_sec');
            $table->unsignedTinyInteger('total_transfers');
            $table->unsignedInteger('walk_distance_meters');
            $table->decimal('score', 5, 4);
            $table->enum('status', ['planned', 'saved', 'archived'])->default('planned');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id']);
            $table->index(['requested_at']);
            $table->index(['status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('journeys');
    }
};
