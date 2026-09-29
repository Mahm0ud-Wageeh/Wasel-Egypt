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
        Schema::table('users', function (Blueprint $table) {
            $table->string('password_hash', 255)->nullable()->change();
            $table->string('google_id', 100)->nullable()->unique()->after('email');
            $table->string('github_id', 100)->nullable()->unique()->after('google_id');
            $table->string('avatar', 500)->nullable()->after('github_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['google_id', 'github_id', 'avatar']);
        });
    }
};
