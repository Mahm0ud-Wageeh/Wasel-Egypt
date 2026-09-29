<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. ai_conversations
        if (!Schema::hasTable('ai_conversations')) {
            Schema::create('ai_conversations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('session_id', 100)->unique();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // 2. ai_messages
        if (!Schema::hasTable('ai_messages')) {
            Schema::create('ai_messages', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('ai_conversation_id');
                $table->enum('role', ['user', 'assistant', 'system'])->default('user');
                $table->text('content');
                $table->string('model_used', 50)->default('gemini-flash');
                $table->integer('tokens_in')->default(0);
                $table->integer('tokens_out')->default(0);
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('ai_conversation_id')->references('id')->on('ai_conversations')->onDelete('cascade');
                $table->index(['ai_conversation_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_messages');
        Schema::dropIfExists('ai_conversations');
    }
};
