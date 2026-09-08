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
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->boolean('notify_journey_planned')->default(false);
            $table->boolean('notify_journey_started')->default(false);
            $table->boolean('notify_deviation_detected')->default(true);
            $table->boolean('notify_recovery_available')->default(true);
            $table->boolean('notify_journey_completed')->default(false);
            $table->boolean('notify_report_status_change')->default(true);
            $table->boolean('notify_service_alert_affected')->default(true);
            $table->boolean('notify_weekly_summary')->default(false);
            $table->boolean('quiet_hours_enabled')->default(false);
            $table->time('quiet_hours_start')->nullable();
            $table->time('quiet_hours_end')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['user_id']);
            $table->index(['notify_journey_planned']);
            $table->index(['notify_journey_started']);
            $table->index(['notify_deviation_detected']);
            $table->index(['notify_recovery_available']);
            $table->index(['notify_journey_completed']);
            $table->index(['notify_report_status_change']);
            $table->index(['notify_service_alert_affected']);
            $table->index(['notify_weekly_summary']);
        });

        // Add check constraint using raw SQL for MySQL compatibility
        // Skip for SQLite as it doesn't support ADD CONSTRAINT ... CHECK syntax
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE notification_preferences ADD CONSTRAINT quiet_hours_valid CHECK ((quiet_hours_start IS NULL AND quiet_hours_end IS NULL) OR (quiet_hours_start < quiet_hours_end))');
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
            DB::statement('ALTER TABLE notification_preferences DROP CONSTRAINT quiet_hours_valid');
        }

        Schema::dropIfExists('notification_preferences');
    }
};
