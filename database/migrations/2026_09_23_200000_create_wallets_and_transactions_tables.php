<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('wallets')) {
            Schema::create('wallets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->decimal('balance', 10, 2)->default(0.00);
                $table->string('currency', 10)->default('EGP');
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->unique('user_id');
            });
        }

        if (!Schema::hasTable('wallet_transactions')) {
            Schema::create('wallet_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('wallet_id')->constrained('wallets')->onDelete('cascade');
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->enum('type', ['topup', 'trip_fare', 'refund', 'pass_subscription']);
                $table->decimal('amount', 10, 2);
                $table->decimal('balance_after', 10, 2);
                $table->string('reference_id', 100)->nullable();
                $table->string('description_ar', 255);
                $table->string('description_en', 255)->nullable();
                $table->string('status', 20)->default('completed');
                $table->timestamps();

                $table->index(['user_id', 'created_at']);
                $table->index(['wallet_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('wallets');
    }
};
