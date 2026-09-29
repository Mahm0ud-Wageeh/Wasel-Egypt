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
        Schema::create('user_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->json('preferred_modes')->nullable();
            $table->json('avoided_modes')->nullable();
            $table->unsignedTinyInteger('max_transfers')->default(3);
            $table->enum('walk_speed', ['slow', 'average', 'fast'])->default('average');
            $table->boolean('avoid_hills')->default(false);
            $table->boolean('wheelchair_accessible')->default(false);
            $table->unsignedSmallInteger('max_walk_distance_per_leg')->default(2000);
            $table->boolean('notification_email_enabled')->default(true);
            $table->boolean('notification_push_enabled')->default(true);
            $table->boolean('notification_sms_enabled')->default(false);
            $table->time('quiet_hours_start')->nullable();
            $table->time('quiet_hours_end')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_preferences');
    }
};
