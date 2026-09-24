<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. If legacy transfers table exists with journey_id, rename it to journey_leg_transfers
        if (Schema::hasTable('transfers') && Schema::hasColumn('transfers', 'journey_id')) {
            Schema::rename('transfers', 'journey_leg_transfers');
        }

        // 2. Create the ERD v2.1 station-to-station transfers table
        if (!Schema::hasTable('transfers')) {
            Schema::create('transfers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('from_stop_id');
                $table->unsignedBigInteger('to_stop_id');
                $table->integer('min_transfer_time_s')->default(180);
                $table->integer('distance_m')->default(50);
                $table->boolean('is_accessible')->default(true);
                $table->timestamps();

                $table->foreign('from_stop_id')->references('id')->on('transit_stops')->onDelete('cascade');
                $table->foreign('to_stop_id')->references('id')->on('transit_stops')->onDelete('cascade');
                $table->unique(['from_stop_id', 'to_stop_id'], 'transfers_from_to_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('transfers');

        if (Schema::hasTable('journey_leg_transfers')) {
            Schema::rename('journey_leg_transfers', 'transfers');
        }
    }
};
