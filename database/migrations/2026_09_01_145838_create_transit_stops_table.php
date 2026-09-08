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
        Schema::create('transit_stops', function (Blueprint $table) {
            $table->id();
            $table->string('gtfs_stop_id', 100)->unique()->nullable();
            $table->string('name', 150);
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->string('location_accuracy', 20)->nullable();
            $table->boolean('wheelchair_accessible')->default(false);
            $table->string('platform_code', 20)->nullable();
            $table->foreignId('area_id')->nullable()->constrained()->onDelete('set null')->onUpdate('cascade');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['latitude', 'longitude']);
            $table->index(['area_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transit_stops');
    }
};
