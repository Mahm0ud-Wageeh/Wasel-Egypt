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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade')->onUpdate('cascade');
            $table->foreignId('template_id')->nullable()->constrained('notification_templates')->onDelete('set null')->onUpdate('cascade');
            $table->string('title', 255);
            $table->text('body');
            $table->json('data_payload')->nullable();
            $table->enum('sent_via', ['push', 'email', 'sms', 'inapp'])->default('push');
            $table->timestamp('sent_at')->useCurrent();
            $table->timestamp('read_at')->nullable();
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id']);
            $table->index(['sent_at']);
            $table->index(['user_id', 'read_at']);
            $table->index(['template_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
