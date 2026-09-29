<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('route_alerts')) {
            Schema::create('route_alerts', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('route_id')->nullable();
                $table->unsignedBigInteger('transit_stop_id')->nullable();
                $table->enum('severity', ['info', 'warning', 'critical'])->default('info');
                $table->string('title', 255);
                $table->string('title_ar', 255)->nullable();
                $table->text('body')->nullable();
                $table->text('body_ar')->nullable();
                $table->timestamp('starts_at')->useCurrent();
                $table->timestamp('ends_at')->nullable();
                $table->enum('source', ['official', 'community'])->default('official');
                $table->timestamps();

                $table->foreign('route_id')->references('id')->on('routes')->onDelete('cascade');
                $table->foreign('transit_stop_id')->references('id')->on('transit_stops')->onDelete('cascade');
                $table->index(['starts_at', 'ends_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('route_alerts');
    }
};
