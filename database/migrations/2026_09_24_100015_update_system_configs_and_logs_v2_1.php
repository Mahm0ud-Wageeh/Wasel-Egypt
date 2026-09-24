<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. system_configs (plural)
        if (!Schema::hasTable('system_configs')) {
            Schema::create('system_configs', function (Blueprint $table) {
                $table->id();
                $table->string('key', 100)->unique();
                $table->text('value')->nullable();
                $table->string('category', 50)->default('general');
                $table->boolean('is_public')->default(false);
                $table->timestamps();
            });

            // Migrate data from system_config if present
            if (Schema::hasTable('system_config')) {
                $configs = DB::table('system_config')->get();
                foreach ($configs as $c) {
                    DB::table('system_configs')->insert([
                        'key' => $c->config_key,
                        'value' => $c->config_value,
                        'category' => $c->config_type ?? 'general',
                        'is_public' => false,
                        'created_at' => $c->created_at ?? now(),
                        'updated_at' => $c->updated_at ?? now(),
                    ]);
                }
            }
        }

        // 2. data_import_logs
        Schema::table('data_import_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('data_import_logs', 'entity_type')) {
                $table->string('entity_type', 50)->nullable()->after('source');
            }
            if (!Schema::hasColumn('data_import_logs', 'record_count')) {
                $table->integer('record_count')->default(0)->after('entity_type');
            }
            if (!Schema::hasColumn('data_import_logs', 'notes')) {
                $table->text('notes')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('data_import_logs', function (Blueprint $table) {
            $table->dropColumn(['entity_type', 'record_count', 'notes']);
        });

        Schema::dropIfExists('system_configs');
    }
};
