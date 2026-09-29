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
        Schema::create('service_alerts', function (Blueprint $table) {
            $table->id();
            $table->string('gtfs_alert_id', 100)->unique()->nullable();
            $table->string('header_text', 255);
            $table->text('description_text')->nullable();
            $table->string('url', 500)->nullable();
            $table->enum('severity', ['unknown', 'minor', 'moderate', 'severe'])->default('unknown');
            $table->enum('consequence', ['unknown', 'stop_moved', 'no_service', 'reduced_service', 'significant_delay', 'detour', 'additional_service', 'unknown_effect', 'stop_moved_back'])->default('unknown');
            $table->dateTime('active_period_start');
            $table->dateTime('active_period_end');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['active_period_start', 'active_period_end']);
            $table->index(['severity']);
            $table->index(['consequence']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_alerts');
    }
};
