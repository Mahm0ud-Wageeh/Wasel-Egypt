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
        Schema::create('aggregated_metrics', function (Blueprint $table) {
            $table->id();
            $table->string('metric_name', 100);
            $table->decimal('metric_value', 20, 6);
            $table->json('dimension')->nullable();
            $table->dateTime('period_start');
            $table->dateTime('period_end');
            $table->timestamp('calculated_at')->useCurrent();
            $table->timestamps();

            $table->unique(['metric_name', 'dimension', 'period_start', 'period_end'], 'unique_metric_dim_period');
            $table->index(['metric_name']);
            $table->index(['period_start', 'period_end']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('aggregated_metrics');
    }
};
