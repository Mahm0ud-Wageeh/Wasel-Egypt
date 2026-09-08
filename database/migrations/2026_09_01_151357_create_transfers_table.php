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
        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journey_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->foreignId('from_leg_id')->constrained('journey_legs')->onDelete('cascade')->onUpdate('cascade');
            $table->foreignId('to_leg_id')->constrained('journey_legs')->onDelete('cascade')->onUpdate('cascade');
            $table->enum('transfer_type', ['walking', 'waiting', 'transfer_walk']);
            $table->unsignedInteger('transfer_duration_sec');
            $table->decimal('from_lat', 10, 8);
            $table->decimal('from_longitude', 11, 8);
            $table->decimal('to_lat', 10, 8);
            $table->decimal('to_longitude', 11, 8);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['journey_id']);
            $table->index(['from_leg_id']);
            $table->index(['to_leg_id']);
        });

        // Add check constraints using raw SQL for MySQL compatibility
        // Skip for SQLite as it doesn't support ADD CONSTRAINT ... CHECK syntax
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE transfers ADD CONSTRAINT transfer_legs_diff CHECK (from_leg_id <> to_leg_id)');
            DB::statement('ALTER TABLE transfers ADD CONSTRAINT from_lat_range CHECK (from_lat BETWEEN -90 AND 90)');
            DB::statement('ALTER TABLE transfers ADD CONSTRAINT from_lng_range CHECK (from_longitude BETWEEN -180 AND 180)');
            DB::statement('ALTER TABLE transfers ADD CONSTRAINT to_lat_range CHECK (to_lat BETWEEN -90 AND 90)');
            DB::statement('ALTER TABLE transfers ADD CONSTRAINT to_lng_range CHECK (to_longitude BETWEEN -180 AND 180)');
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
            DB::statement('ALTER TABLE transfers DROP CONSTRAINT transfer_legs_diff');
            DB::statement('ALTER TABLE transfers DROP CONSTRAINT from_lat_range');
            DB::statement('ALTER TABLE transfers DROP CONSTRAINT from_lng_range');
            DB::statement('ALTER TABLE transfers DROP CONSTRAINT to_lat_range');
            DB::statement('ALTER TABLE transfers DROP CONSTRAINT to_lng_range');
        }

        Schema::dropIfExists('transfers');
    }
};
