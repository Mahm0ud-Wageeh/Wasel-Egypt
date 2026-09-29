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
        Schema::create('routes', function (Blueprint $table) {
            $table->id();
            $table->string('gtfs_route_id', 100)->unique()->nullable();
            $table->foreignId('transit_operator_id')->constrained()->onDelete('restrict')->onUpdate('cascade');
            $table->foreignId('transit_mode_id')->constrained()->onDelete('restrict')->onUpdate('cascade');
            $table->string('short_name', 50)->nullable();
            $table->string('long_name', 150);
            $table->text('description')->nullable();
            $table->string('color', 7)->nullable();
            $table->string('text_color', 7)->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->integer('type')->nullable(); // GTFS route type
            $table->string('url', 255)->nullable();
            $table->integer('continuous_pickup')->nullable(); // GTFS continuous pickup
            $table->integer('continuous_drop_off')->nullable(); // GTFS continuous drop off
            $table->timestamps();
            $table->softDeletes();

            $table->index(['transit_mode_id']);
            $table->index(['transit_operator_id']);
            $table->index(['active']);
            $table->index(['type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('routes');
    }
};
