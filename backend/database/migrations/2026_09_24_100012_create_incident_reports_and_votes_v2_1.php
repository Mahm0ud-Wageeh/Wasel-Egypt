<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. incident_reports
        if (!Schema::hasTable('incident_reports')) {
            Schema::create('incident_reports', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('route_id')->nullable();
                $table->unsignedBigInteger('transit_stop_id')->nullable();
                $table->enum('kind', ['delay', 'crowd', 'elevator', 'safety'])->default('delay');
                $table->enum('severity', ['low', 'med', 'high'])->default('low');
                $table->enum('status', ['pending', 'confirmed', 'dismissed'])->default('pending');
                $table->text('description')->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->integer('confirms')->default(0);
                $table->integer('denies')->default(0);
                $table->float('trust_score')->default(0);
                $table->timestamp('resolved_at')->nullable();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('route_id')->references('id')->on('routes')->onDelete('set null');
                $table->foreign('transit_stop_id')->references('id')->on('transit_stops')->onDelete('set null');
                $table->index(['status', 'created_at']);
            });

            // Migrate community_reports if present
            if (Schema::hasTable('community_reports')) {
                $kindMap = [
                    'delay' => 'delay',
                    'overcrowding' => 'crowd',
                    'cleanliness' => 'safety',
                    'safety' => 'safety',
                    'stop_damage' => 'elevator',
                    'signage_issue' => 'delay',
                    'accessibility' => 'elevator',
                ];

                $reports = DB::table('community_reports')->get();
                foreach ($reports as $cr) {
                    DB::table('incident_reports')->insert([
                        'id' => $cr->id,
                        'user_id' => $cr->user_id,
                        'route_id' => $cr->related_route_id,
                        'transit_stop_id' => $cr->related_stop_id,
                        'kind' => $kindMap[$cr->report_type] ?? 'delay',
                        'severity' => 'low',
                        'status' => $cr->status === 'verified' ? 'confirmed' : ($cr->status === 'rejected' ? 'dismissed' : 'pending'),
                        'description' => $cr->description,
                        'latitude' => $cr->latitude,
                        'longitude' => $cr->longitude,
                        'confirms' => 0,
                        'denies' => 0,
                        'trust_score' => 0,
                        'created_at' => $cr->created_at ?? now(),
                        'updated_at' => $cr->updated_at ?? now(),
                    ]);
                }
            }
        }

        // 2. incident_votes
        if (!Schema::hasTable('incident_votes')) {
            Schema::create('incident_votes', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('incident_report_id');
                $table->unsignedBigInteger('user_id');
                $table->enum('vote', ['confirm', 'deny']);
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('incident_report_id')->references('id')->on('incident_reports')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->unique(['incident_report_id', 'user_id'], 'incident_votes_report_user_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('incident_votes');
        Schema::dropIfExists('incident_reports');
    }
};
