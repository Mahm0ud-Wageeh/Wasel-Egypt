<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('recovery_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deviation_event_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->foreignId('alternative_journey_id')->constrained('journeys')->onDelete('cascade')->onUpdate('cascade');
            $table->unsignedInteger('estimated_delay_sec');
            $table->timestamp('generated_at')->useCurrent();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['deviation_event_id']);
            $table->index(['alternative_journey_id']);
            $table->index(['accepted_at']);
        });

        // Add check constraint using raw SQL for MySQL compatibility
        // Skip for SQLite as it doesn't support ADD CONSTRAINT ... CHECK syntax
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE recovery_routes ADD CONSTRAINT delay_nonneg CHECK (estimated_delay_sec >= 0)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop check constraint
        // Skip for SQLite as it doesn't support DROP CONSTRAINT ... CHECK syntax
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE recovery_routes DROP CONSTRAINT delay_nonneg');
        }

        Schema::dropIfExists('recovery_routes');
    }
};
