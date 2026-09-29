<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create journey_leg_transfers table if it does not exist
        if (!Schema::hasTable('journey_leg_transfers')) {
            Schema::create('journey_leg_transfers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('journey_id');
                $table->unsignedBigInteger('from_leg_id');
                $table->unsignedBigInteger('to_leg_id');
                $table->enum('transfer_type', ['walking', 'waiting', 'transfer_walk'])->default('walking');
                $table->unsignedInteger('transfer_duration_sec')->default(180);
                $table->decimal('from_lat', 10, 8)->nullable();
                $table->decimal('from_longitude', 11, 8)->nullable();
                $table->decimal('to_lat', 10, 8)->nullable();
                $table->decimal('to_longitude', 11, 8)->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 2. In transfers table, ensure ERD v2.1 stop-to-stop transfer columns exist
        if (Schema::hasTable('transfers')) {
            Schema::table('transfers', function (Blueprint $table) {
                if (!Schema::hasColumn('transfers', 'from_stop_id')) {
                    $table->unsignedBigInteger('from_stop_id')->nullable()->after('id');
                }
                if (!Schema::hasColumn('transfers', 'to_stop_id')) {
                    $table->unsignedBigInteger('to_stop_id')->nullable()->after('from_stop_id');
                }
                if (!Schema::hasColumn('transfers', 'min_transfer_time_s')) {
                    $table->integer('min_transfer_time_s')->default(180)->after('to_stop_id');
                }
                if (!Schema::hasColumn('transfers', 'distance_m')) {
                    $table->integer('distance_m')->default(50)->after('min_transfer_time_s');
                }
                if (!Schema::hasColumn('transfers', 'is_accessible')) {
                    $table->boolean('is_accessible')->default(true)->after('distance_m');
                }
            });

            if (DB::getDriverName() !== 'sqlite') {
                try {
                    DB::statement('ALTER TABLE transfers MODIFY journey_id BIGINT UNSIGNED NULL');
                    DB::statement('ALTER TABLE transfers MODIFY from_leg_id BIGINT UNSIGNED NULL');
                    DB::statement('ALTER TABLE transfers MODIFY to_leg_id BIGINT UNSIGNED NULL');
                    DB::statement('ALTER TABLE transfers MODIFY transfer_type VARCHAR(50) NULL');
                    DB::statement('ALTER TABLE transfers MODIFY transfer_duration_sec INT UNSIGNED NULL');
                    DB::statement('ALTER TABLE transfers MODIFY from_lat DECIMAL(10,8) NULL');
                    DB::statement('ALTER TABLE transfers MODIFY from_longitude DECIMAL(11,8) NULL');
                    DB::statement('ALTER TABLE transfers MODIFY to_lat DECIMAL(10,8) NULL');
                    DB::statement('ALTER TABLE transfers MODIFY to_longitude DECIMAL(11,8) NULL');
                } catch (\Throwable $e) {
                    // Ignore if already nullable or constraints restrict modification
                }
            }
        } else {
            Schema::create('transfers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('from_stop_id')->nullable();
                $table->unsignedBigInteger('to_stop_id')->nullable();
                $table->integer('min_transfer_time_s')->default(180);
                $table->integer('distance_m')->default(50);
                $table->boolean('is_accessible')->default(true);
                $table->unsignedBigInteger('journey_id')->nullable();
                $table->unsignedBigInteger('from_leg_id')->nullable();
                $table->unsignedBigInteger('to_leg_id')->nullable();
                $table->string('transfer_type')->nullable();
                $table->unsignedInteger('transfer_duration_sec')->nullable();
                $table->decimal('from_lat', 10, 8)->nullable();
                $table->decimal('from_longitude', 11, 8)->nullable();
                $table->decimal('to_lat', 10, 8)->nullable();
                $table->decimal('to_longitude', 11, 8)->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('journey_leg_transfers');
    }
};
