<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Anti-tabrakan balasan.
     *
     * 1. idempotency_key (UUID v4 dari frontend) + unique (ticket_id, idempotency_key)
     *    membuat double submit / retry jaringan aman: request kembar dengan key
     *    sama akan menabrak unique index dan bisa di-replay, bukan disimpan dobel.
     *
     * 2. respon_awal_ticket_id adalah generated column: bernilai ticket_id hanya
     *    untuk baris bertipe 'respon_awal', NULL untuk tipe lain. Unique index
     *    memaksa "satu respon awal per tiket" di level database. MySQL mengabaikan
     *    NULL pada unique index, jadi balasan_pelapor / respon_substantif bebas.
     *
     * Catatan: pakai VIRTUAL, bukan STORED. MySQL menolak STORED generated column
     *    yang mereferensikan kolom FK (errno 1215) pada tabel ini.
     *
     * Alembic bahasa: MySQL tidak punya partial unique index, jadi generated
     *    column adalah padanan terdekat yang portabel untuk guard ini.
     */
    public function up(): void
    {
        Schema::table('ticket_responses', function (Blueprint $table) {
            $table->string('idempotency_key', 36)->nullable()->after('message');
            $table->unsignedBigInteger('respon_awal_ticket_id')
                ->nullable()
                ->virtualAs("if(`type` = 'respon_awal', `ticket_id`, NULL)")
                ->after('type');
        });

        Schema::table('ticket_responses', function (Blueprint $table) {
            $table->unique(['ticket_id', 'idempotency_key'], 'ticket_responses_ticket_id_idempotency_key_unique');
            $table->unique('respon_awal_ticket_id', 'ticket_responses_respon_awal_unique');
        });
    }

    public function down(): void
    {
        Schema::table('ticket_responses', function (Blueprint $table) {
            $table->dropUnique('ticket_responses_ticket_id_idempotency_key_unique');
            $table->dropUnique('ticket_responses_respon_awal_unique');
            $table->dropColumn(['idempotency_key', 'respon_awal_ticket_id']);
        });
    }
};
