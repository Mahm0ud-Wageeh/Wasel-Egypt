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
        Schema::create('report_moderations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('community_report_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->foreignId('moderator_id')->constrained('users')->onDelete('restrict')->onUpdate('cascade');
            $table->enum('action_taken', ['verify', 'reject', 'resolve']);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['community_report_id']);
            $table->index(['moderator_id']);
            $table->index(['action_taken']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_moderations');
    }
};
