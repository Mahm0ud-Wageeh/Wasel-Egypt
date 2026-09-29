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
        Schema::table('journey_progress', function (Blueprint $table) {
            $table->index(['active_journey_id', 'recorded_at', 'id'], 'journey_progress_active_recorded_id_index');
        });

        Schema::table('active_journeys', function (Blueprint $table) {
            $table->index(['user_id', 'status', 'started_at'], 'active_journeys_user_status_started_index');
        });

        Schema::table('deviation_events', function (Blueprint $table) {
            $table->index(['active_journey_id', 'occurred_at', 'id'], 'deviation_events_active_occurred_id_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('journey_progress', function (Blueprint $table) {
            $table->dropIndex('journey_progress_active_recorded_id_index');
        });

        Schema::table('active_journeys', function (Blueprint $table) {
            $table->dropIndex('active_journeys_user_status_started_index');
        });

        Schema::table('deviation_events', function (Blueprint $table) {
            $table->dropIndex('deviation_events_active_occurred_id_index');
        });
    }
};
