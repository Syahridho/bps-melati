<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Run the migrations. */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event_type')->index();
            $table->string('category')->index();
            $table->string('severity')->default('info');
            $table->foreignId('actor_id')->nullable()->index();
            $table->string('actor_name')->nullable();
            $table->string('actor_role')->nullable();
            $table->foreignId('ticket_id')->nullable()->index();
            $table->string('ip')->nullable();
            $table->string('user_agent')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->index(['created_at', 'event_type']);
            $table->index(['created_at', 'actor_id']);
            $table->index(['created_at', 'ticket_id']);
        });
    }

    /** Reverse the migrations. */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};