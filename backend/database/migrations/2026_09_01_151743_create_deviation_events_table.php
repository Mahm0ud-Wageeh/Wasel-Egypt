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
        Schema::create('deviation_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('active_journey_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->timestamp('occurred_at')->useCurrent();
            $table->enum('deviation_type', ['early', 'late', 'missed_stop', 'off_route', 'vehicle_change']);
            $table->string('description', 255)->nullable();
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->enum('severity', ['low', 'medium', 'high'])->default('medium');
            $table->foreignId('expected_stop_id')->nullable()->constrained('transit_stops')->onDelete('set null')->onUpdate('cascade');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['active_journey_id']);
            $table->index(['occurred_at']);
            $table->index(['deviation_type']);
            $table->index(['severity']);
        });

        // Add check constraints using raw SQL for MySQL compatibility
        // Skip for SQLite as it doesn't support ADD CONSTRAINT ... CHECK syntax
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE deviation_events ADD CONSTRAINT lat_range CHECK (latitude BETWEEN -90 AND 90)');
            DB::statement('ALTER TABLE deviation_events ADD CONSTRAINT lng_range CHECK (longitude BETWEEN -180 AND 180)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop check constraints
        // Skip for SQLite as it doesn't support DROP CONSTRAINT ... CHECK syntax
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE deviation_events DROP CONSTRAINT lat_range');
            DB::statement('ALTER TABLE deviation_events DROP CONSTRAINT lng_range');
        }

        Schema::dropIfExists('deviation_events');
    }
};
