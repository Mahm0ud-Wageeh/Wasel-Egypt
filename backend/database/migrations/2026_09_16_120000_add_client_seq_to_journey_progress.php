<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Offline-queue support for journey progress pings.
     *
     * - client_seq: per-journey monotonic sequence allocated by the client
     *   BEFORE the first POST attempt, so a live ping that times out on the
     *   wire but was recorded can be safely retried from the offline queue
     *   without creating a duplicate row. NULL = legacy ping, unaffected
     *   (MySQL permits multiple NULLs in a unique index).
     * - is_backfill: true when the ping arrived late (tunnel flush) and was
     *   therefore recorded without triggering deviation detection.
     */
    public function up(): void
    {
        Schema::table('journey_progress', function (Blueprint $table) {
            $table->unsignedBigInteger('client_seq')->nullable()->after('active_journey_id');
            $table->boolean('is_backfill')->default(false)->after('client_seq');
            $table->unique(['active_journey_id', 'client_seq'], 'journey_progress_active_seq_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('journey_progress', function (Blueprint $table) {
            $table->dropUnique('journey_progress_active_seq_unique');
            $table->dropColumn(['client_seq', 'is_backfill']);
        });
    }
};
