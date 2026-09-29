<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('transit_tickets')) {
            Schema::create('transit_tickets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('ticket_code', 32)->unique();
                $table->string('qr_payload', 255);
                $table->string('transit_mode', 20)->default('metro');
                $table->string('origin_station', 100);
                $table->string('destination_station', 100);
                $table->decimal('fare_amount', 8, 2);
                $table->integer('zones_count')->default(1);
                $table->enum('status', ['active', 'used', 'expired', 'refunded'])->default('active');
                $table->timestamp('valid_until');
                $table->timestamp('used_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'status']);
                $table->index(['ticket_code']);
            });
        }

        if (!Schema::hasTable('user_carbon_rewards')) {
            Schema::create('user_carbon_rewards', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->decimal('total_distance_km', 10, 2)->default(0.00);
                $table->decimal('co2_saved_kg', 10, 2)->default(0.00);
                $table->integer('points_balance')->default(0);
                $table->integer('total_points_earned')->default(0);
                $table->timestamps();

                $table->unique('user_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_carbon_rewards');
        Schema::dropIfExists('transit_tickets');
    }
};
