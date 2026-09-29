<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. users
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'locale')) {
                $table->enum('locale', ['ar', 'en'])->default('ar')->after('status');
            }
            if (!Schema::hasColumn('users', 'phone_verified_at')) {
                $table->timestamp('phone_verified_at')->nullable()->after('email_verified_at');
            }
        });

        // 2. roles
        Schema::table('roles', function (Blueprint $table) {
            if (!Schema::hasColumn('roles', 'display_name')) {
                $table->string('display_name', 100)->nullable()->after('name');
            }
        });

        // 3. permissions
        Schema::table('permissions', function (Blueprint $table) {
            if (!Schema::hasColumn('permissions', 'category')) {
                $table->string('category', 50)->nullable()->after('name');
            }
        });

        if (Schema::hasColumn('permissions', 'resource')) {
            DB::statement("UPDATE permissions SET category = resource WHERE category IS NULL AND resource IS NOT NULL");
        }

        // 4. role_user (composite PK)
        if (!Schema::hasTable('role_user')) {
            Schema::create('role_user', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('role_id');
                $table->primary(['user_id', 'role_id']);

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
            });

            // Migrate data from user_roles
            if (Schema::hasTable('user_roles')) {
                $userRoles = DB::table('user_roles')->select('user_id', 'role_id')->distinct()->get();
                foreach ($userRoles as $ur) {
                    DB::table('role_user')->insertOrIgnore([
                        'user_id' => $ur->user_id,
                        'role_id' => $ur->role_id,
                    ]);
                }
            }
        }

        // 5. role_permission (composite PK)
        if (!Schema::hasTable('role_permission')) {
            Schema::create('role_permission', function (Blueprint $table) {
                $table->unsignedBigInteger('role_id');
                $table->unsignedBigInteger('permission_id');
                $table->primary(['role_id', 'permission_id']);

                $table->foreign('role_id')->references('id')->on('roles')->onDelete('cascade');
                $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
            });

            // Migrate data from role_permissions
            if (Schema::hasTable('role_permissions')) {
                $rolePerms = DB::table('role_permissions')->select('role_id', 'permission_id')->distinct()->get();
                foreach ($rolePerms as $rp) {
                    DB::table('role_permission')->insertOrIgnore([
                        'role_id' => $rp->role_id,
                        'permission_id' => $rp->permission_id,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('role_permission');
        Schema::dropIfExists('role_user');

        Schema::table('permissions', function (Blueprint $table) {
            $table->dropColumn('category');
        });

        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn('display_name');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['locale', 'phone_verified_at']);
        });
    }
};
