<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. journey_events
        if (!Schema::hasTable('journey_events')) {
            Schema::create('journey_events', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('journey_id');
                $table->string('event_type', 50)->comment('deviation|reroute|arrived');
                $table->json('payload_json')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('journey_id')->references('id')->on('journeys')->onDelete('cascade');
                $table->index(['journey_id', 'created_at']);
            });

            // Migrate deviation_events if present
            if (Schema::hasTable('deviation_events')) {
                $devEvents = DB::table('deviation_events')->get();
                foreach ($devEvents as $de) {
                    $journeyId = DB::table('active_journeys')->where('id', $de->active_journey_id)->value('journey_id') ?? 1;
                    DB::table('journey_events')->insert([
                        'journey_id' => $journeyId,
                        'event_type' => 'deviation',
                        'payload_json' => json_encode($de),
                        'created_at' => $de->detected_at ?? $de->created_at ?? now(),
                    ]);
                }
            }
        }

        // 2. journey_tracks
        if (!Schema::hasTable('journey_tracks')) {
            Schema::create('journey_tracks', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('journey_id');
                $table->decimal('latitude', 10, 7);
                $table->decimal('longitude', 10, 7);
                $table->integer('accuracy_m')->nullable();
                $table->timestamp('recorded_at')->useCurrent();

                $table->foreign('journey_id')->references('id')->on('journeys')->onDelete('cascade');
                $table->index(['journey_id', 'recorded_at']);
            });

            // Migrate journey_progress if present
            if (Schema::hasTable('journey_progress')) {
                $progressRows = DB::table('journey_progress')->get();
                foreach ($progressRows as $pr) {
                    $journeyId = DB::table('active_journeys')->where('id', $pr->active_journey_id)->value('journey_id') ?? 1;
                    DB::table('journey_tracks')->insert([
                        'journey_id' => $journeyId,
                        'latitude' => $pr->latitude,
                        'longitude' => $pr->longitude,
                        'accuracy_m' => (int)($pr->accuracy_meters ?? 0),
                        'recorded_at' => $pr->recorded_at ?? $pr->created_at ?? now(),
                    ]);
                }
            }
        }

        // 3. trip_feedback
        if (!Schema::hasTable('trip_feedback')) {
            Schema::create('trip_feedback', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('journey_id')->unique();
                $table->unsignedBigInteger('user_id');
                $table->tinyInteger('rating')->comment('1-5');
                $table->text('comment')->nullable();
                $table->timestamps();

                $table->foreign('journey_id')->references('id')->on('journeys')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_feedback');
        Schema::dropIfExists('journey_tracks');
        Schema::dropIfExists('journey_events');
    }
};
