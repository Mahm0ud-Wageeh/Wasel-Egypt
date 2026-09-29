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
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_variant_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->string('gtfs_trip_id', 100)->unique()->nullable();
            $table->string('service_id', 100)->nullable();
            $table->unsignedTinyInteger('direction_id')->default(0);
            $table->string('headsign', 150)->nullable();
            $table->boolean('wheelchair_accessible')->default(false);
            $table->text('notes')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['route_variant_id']);
            $table->index(['start_date', 'end_date']);
            $table->index(['gtfs_trip_id']);
            $table->index(['wheelchair_accessible']);
            $table->index(['is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};
