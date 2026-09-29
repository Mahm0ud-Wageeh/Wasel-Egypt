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
        Schema::create('favorite_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->string('name', 100);
            $table->string('address', 255)->nullable();
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->enum('place_type', ['home', 'work', 'school', 'other'])->default('other');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['user_id', 'name']);
            $table->index(['user_id']);
            $table->index(['latitude', 'longitude']);
            $table->index(['place_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('favorite_locations');
    }
};
