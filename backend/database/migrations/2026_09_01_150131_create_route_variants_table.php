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
        Schema::create('route_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->string('name', 100);
            $table->enum('direction', ['outbound', 'inbound', 'loop'])->default('outbound');
            $table->string('headsign', 150)->nullable();
            $table->boolean('active')->default(true);
            $table->decimal('reliability_score', 3, 2)->nullable(); // 0.00-1.00
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['route_id', 'name', 'direction']);
            $table->index(['route_id']);
            $table->index(['active']);
            $table->index(['reliability_score']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('route_variants');
    }
};
