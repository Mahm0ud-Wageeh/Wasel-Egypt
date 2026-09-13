<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Published fare products for the transit network.
     *
     * data_status distinguishes REAL fares (imported from authoritative
     * sources, e.g. the TfC Cairo Metro matrix) from DEMO/ESTIMATED seeds
     * that stand in until real data exists — the product must never present
     * an estimated price as official. Estimated rows are editable by
     * administrators without any code change.
     */
    public function up(): void
    {
        Schema::create('fares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transit_mode_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('transit_operator_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('route_id')->nullable()->constrained()->nullOnDelete();
            $table->string('label'); // "Metro Tier 1", "CTA bus base fare"
            $table->string('tier')->nullable(); // zone/tier identifier where used
            $table->foreignId('origin_stop_id')->nullable()->constrained('transit_stops')->nullOnDelete();
            $table->foreignId('destination_stop_id')->nullable()->constrained('transit_stops')->nullOnDelete();
            $table->string('zone')->nullable();
            $table->decimal('distance_min_km', 6, 2)->nullable();
            $table->decimal('distance_max_km', 6, 2)->nullable();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('EGP');
            $table->decimal('student_amount', 10, 2)->nullable();
            $table->decimal('senior_amount', 10, 2)->nullable();
            $table->string('card_type')->nullable(); // ticket, card, pass
            $table->date('effective_from')->nullable();
            $table->date('effective_until')->nullable();
            $table->string('source')->default('manual'); // tfc_metro_fares, demo_seed, manual
            $table->string('confidence', 20)->default('verified'); // verified | estimated
            $table->string('data_status', 20)->default('real'); // real | demo_estimated
            $table->string('status', 20)->default('active'); // active | draft | archived
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['transit_mode_id', 'status', 'data_status']);
            $table->index(['effective_from', 'effective_until']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fares');
    }
};
