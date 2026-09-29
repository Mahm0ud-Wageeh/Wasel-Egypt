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
        Schema::create('service_alert_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_alert_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->foreignId('route_variant_id')->constrained()->onDelete('restrict')->onUpdate('cascade');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['service_alert_id', 'route_variant_id']);
            $table->index(['service_alert_id']);
            $table->index(['route_variant_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_alert_routes');
    }
};
