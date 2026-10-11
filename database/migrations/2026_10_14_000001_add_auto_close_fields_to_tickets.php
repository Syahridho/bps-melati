<?php

use App\Models\Ticket;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fondasi fitur "auto close laporan".
 *
 * Menambahkan tiga hal yang belum ada:
 *  1. `tickets.last_staff_response_at` — waktu tanggapan petugas terakhir. Ini
 *     adalah titik awal hitungan auto close. Di-backfill dari balasan staf
 *     terakhir pada data yang sudah ada.
 *  2. `tickets.closed_reason` — penanda alasan tiket selesai
 *     (`reporter` | `staff` | `auto_close`).
 *  3. `ticket_responses.is_system` — menandai entri riwayat yang dibuat sistem
 *     (bukan balasan petugas maupun pelapor), mis. "Laporan ditutup otomatis".
 *
 * Migration ini idempoten (guard `hasColumn` / `hasIndex`) dan tidak pernah
 * mengedit migration lama.
 */
return new class extends Migration
{
    public const INDEX_AUTO_CLOSE = 'tickets_auto_close_index';

    public function up(): void
    {
        if (! Schema::hasColumn('tickets', 'last_staff_response_at')) {
            Schema::table('tickets', function (Blueprint $table): void {
                $table->timestamp('last_staff_response_at')->nullable()->after('completed_at');
            });
        }

        if (! Schema::hasColumn('tickets', 'closed_reason')) {
            Schema::table('tickets', function (Blueprint $table): void {
                $table->string('closed_reason', 20)->nullable()->after('completed_at');
            });
        }

        if (! Schema::hasColumn('ticket_responses', 'is_system')) {
            Schema::table('ticket_responses', function (Blueprint $table): void {
                $table->boolean('is_system')->default(false)->after('type');
            });
        }

        // Index untuk query kandidat auto close. Kolom `status` + `classification`
        // sudah punya index parsial; yang kurang adalah ability memfilter per
        // klasifikasi sekaligus berdasarkan waktu.
        if (! Schema::hasIndex('tickets', self::INDEX_AUTO_CLOSE)) {
            Schema::table('tickets', function (Blueprint $table): void {
                $table->index(['status', 'classification', 'last_staff_response_at'], self::INDEX_AUTO_CLOSE);
            });
        }

        $this->backfillLastStaffResponseAt();
    }

    /**
     * Isi `last_staff_response_at` dari balasan staf terakhir (user_id NOT NULL).
     *
     * Diproses per batch lewat chunkById supaya tidak memuat seluruh tabel ke
     * memori dan tidak menahan lock panjang pada tabel `tickets`.
     */
    private function backfillLastStaffResponseAt(): void
    {
        Ticket::query()
            ->whereNull('last_staff_response_at')
            ->whereHas('responses', fn ($q) => $q->whereNotNull('user_id'))
            ->select('id')
            ->chunkById(200, function ($tickets): void {
                foreach ($tickets as $ticket) {
                    $lastStaffResponse = DB::table('ticket_responses')
                        ->where('ticket_id', $ticket->id)
                        ->whereNotNull('user_id')
                        ->orderByDesc('created_at')
                        ->orderByDesc('id')
                        ->first(['created_at']);

                    if ($lastStaffResponse === null) {
                        continue;
                    }

                    DB::table('tickets')
                        ->where('id', $ticket->id)
                        ->update(['last_staff_response_at' => $lastStaffResponse->created_at]);
                }
            });
    }

    public function down(): void
    {
        if (Schema::hasIndex('tickets', self::INDEX_AUTO_CLOSE)) {
            Schema::table('tickets', function (Blueprint $table): void {
                $table->dropIndex(self::INDEX_AUTO_CLOSE);
            });
        }

        if (Schema::hasColumn('ticket_responses', 'is_system')) {
            Schema::table('ticket_responses', function (Blueprint $table): void {
                $table->dropColumn('is_system');
            });
        }

        if (Schema::hasColumn('tickets', 'closed_reason')) {
            Schema::table('tickets', function (Blueprint $table): void {
                $table->dropColumn('closed_reason');
            });
        }

        if (Schema::hasColumn('tickets', 'last_staff_response_at')) {
            Schema::table('tickets', function (Blueprint $table): void {
                $table->dropColumn('last_staff_response_at');
            });
        }
    }
};
