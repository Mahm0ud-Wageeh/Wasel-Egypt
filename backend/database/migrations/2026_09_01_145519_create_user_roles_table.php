<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->foreignId('role_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->timestamp('assigned_at')->default(DB::raw('CURRENT_TIMESTAMP'));
            $table->foreignId('assigned_by')->nullable()->constrained('users')->onDelete('set null')->onUpdate('cascade');
            $table->timestamps();

            $table->unique(['user_id', 'role_id']);
            $table->index(['user_id']);
            $table->index(['role_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_roles');
    }
};
