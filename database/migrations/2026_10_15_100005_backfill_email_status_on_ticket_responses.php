<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Baris yang sudah punya email_sent_at = sudah pernah diserahkan ke SMTP
        DB::table('ticket_responses')
            ->whereNotNull('email_sent_at')
            ->whereNull('email_status')
            ->update(['email_status' => 'sent']);
    }

    public function down(): void
    {
        // Kembalikan ke null — hanya yang di-backfill (sent + email_sent_at terisi)
        DB::table('ticket_responses')
            ->where('email_status', 'sent')
            ->whereNotNull('email_sent_at')
            ->update(['email_status' => null]);
    }
};
