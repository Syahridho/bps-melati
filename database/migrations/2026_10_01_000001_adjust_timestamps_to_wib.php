<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('UPDATE tickets SET created_at = DATE_ADD(created_at, INTERVAL 7 HOUR), updated_at = DATE_ADD(updated_at, INTERVAL 7 HOUR) WHERE created_at IS NOT NULL');
        DB::statement('UPDATE tickets SET completed_at = DATE_ADD(completed_at, INTERVAL 7 HOUR) WHERE completed_at IS NOT NULL');

        DB::statement('UPDATE ticket_responses SET created_at = DATE_ADD(created_at, INTERVAL 7 HOUR), updated_at = DATE_ADD(updated_at, INTERVAL 7 HOUR) WHERE created_at IS NOT NULL');
        DB::statement('UPDATE ticket_responses SET sent_at = DATE_ADD(sent_at, INTERVAL 7 HOUR) WHERE sent_at IS NOT NULL');
        DB::statement('UPDATE ticket_responses SET email_sent_at = DATE_ADD(email_sent_at, INTERVAL 7 HOUR) WHERE email_sent_at IS NOT NULL');

        DB::statement('UPDATE ticket_attachments SET created_at = DATE_ADD(created_at, INTERVAL 7 HOUR), updated_at = DATE_ADD(updated_at, INTERVAL 7 HOUR) WHERE created_at IS NOT NULL');
        DB::statement('UPDATE response_attachments SET created_at = DATE_ADD(created_at, INTERVAL 7 HOUR), updated_at = DATE_ADD(updated_at, INTERVAL 7 HOUR) WHERE created_at IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('UPDATE tickets SET created_at = DATE_SUB(created_at, INTERVAL 7 HOUR), updated_at = DATE_SUB(updated_at, INTERVAL 7 HOUR) WHERE created_at IS NOT NULL');
        DB::statement('UPDATE tickets SET completed_at = DATE_SUB(completed_at, INTERVAL 7 HOUR) WHERE completed_at IS NOT NULL');

        DB::statement('UPDATE ticket_responses SET created_at = DATE_SUB(created_at, INTERVAL 7 HOUR), updated_at = DATE_SUB(updated_at, INTERVAL 7 HOUR) WHERE created_at IS NOT NULL');
        DB::statement('UPDATE ticket_responses SET sent_at = DATE_SUB(sent_at, INTERVAL 7 HOUR) WHERE sent_at IS NOT NULL');
        DB::statement('UPDATE ticket_responses SET email_sent_at = DATE_SUB(email_sent_at, INTERVAL 7 HOUR) WHERE email_sent_at IS NOT NULL');

        DB::statement('UPDATE ticket_attachments SET created_at = DATE_SUB(created_at, INTERVAL 7 HOUR), updated_at = DATE_SUB(updated_at, INTERVAL 7 HOUR) WHERE created_at IS NOT NULL');
        DB::statement('UPDATE response_attachments SET created_at = DATE_SUB(created_at, INTERVAL 7 HOUR), updated_at = DATE_SUB(updated_at, INTERVAL 7 HOUR) WHERE created_at IS NOT NULL');
    }
};
