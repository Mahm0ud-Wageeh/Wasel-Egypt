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
        Schema::create('stop_times', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schedule_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->foreignId('transit_stop_id')->constrained()->onDelete('restrict')->onUpdate('cascade');
            $table->unsignedInteger('sequence');
            $table->time('arrival_time')->nullable();
            $table->time('departure_time')->nullable();
            $table->unsignedTinyInteger('pickup_type')->default(0);
            $table->unsignedTinyInteger('drop_off_type')->default(0);
            $table->boolean('timepoint')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['schedule_id', 'sequence']);
            $table->index(['schedule_id']);
            $table->index(['transit_stop_id']);
            $table->index(['arrival_time', 'departure_time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stop_times');
    }
};
