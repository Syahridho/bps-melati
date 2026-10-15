<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_responses', function (Blueprint $table) {
            $table->string('email_status', 20)->nullable()->after('email_sent_at')
                ->comment('pending|sent|failed|bounced|skipped');
            $table->timestamp('email_failed_at')->nullable()->after('email_status');
            $table->text('email_error')->nullable()->after('email_failed_at');
            $table->timestamp('email_bounced_at')->nullable()->after('email_error');
        });
    }

    public function down(): void
    {
        Schema::table('ticket_responses', function (Blueprint $table) {
            $table->dropColumn(['email_status', 'email_failed_at', 'email_error', 'email_bounced_at']);
        });
    }
};
