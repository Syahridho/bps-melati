<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Run the migrations. */
    public function up(): void
    {
        Schema::create('audit_flags', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->enum('severity', ['info', 'notice', 'warning'])->default('info');
            $table->foreignId('ticket_id')->nullable();
            $table->foreignId('related_user_id')->nullable(); // petugas yang cocok
            $table->foreignId('audit_log_id');
            $table->json('details')->nullable();
            $table->enum('status', ['baru', 'ditinjau', 'wajar', 'tindak_lanjut'])->default('baru');
            $table->foreignId('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();
            $table->boolean('exclude_rating')->default(false);
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::table('audit_flags', function (Blueprint $table) {
            $table->index('status');
            $table->index('ticket_id');
            $table->index('created_at');
        });
    }

    /** Reverse the migrations. */
    public function down(): void
    {
        Schema::dropIfExists('audit_flags');
    }
};