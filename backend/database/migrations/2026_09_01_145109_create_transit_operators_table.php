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
        Schema::create('transit_operators', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('short_code', 20)->unique()->nullable();
            $table->string('website', 255)->nullable();
            $table->string('phone', 20)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transit_operators');
    }
};
