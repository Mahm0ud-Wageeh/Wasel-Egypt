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
        Schema::create('community_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->enum('report_type', ['delay', 'early_arrival', 'overcrowding', 'cleanliness', 'safety', 'stop_damage', 'signage_issue', 'accessibility', 'suggestion', 'complaint', 'other']);
            $table->text('description');
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->timestamp('occurred_at')->useCurrent();
            $table->enum('status', ['pending', 'verified', 'rejected', 'resolved'])->default('pending');
            $table->json('media_urls')->nullable();
            $table->foreignId('related_route_id')->nullable()->constrained('route_variants')->onDelete('set null')->onUpdate('cascade');
            $table->foreignId('related_stop_id')->nullable()->constrained('transit_stops')->onDelete('set null')->onUpdate('cascade');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id']);
            $table->index(['status']);
            $table->index(['occurred_at']);
            $table->index(['latitude', 'longitude']);
            $table->index(['report_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('community_reports');
    }
};
