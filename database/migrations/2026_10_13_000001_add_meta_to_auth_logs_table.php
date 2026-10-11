<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Menambahkan kolom `meta` (JSON) ke `auth_logs`.
 *
 * KRONOLOGI (jangan dihapus dari komentar):
 *   Migration `2026_10_12_000002_create_auth_logs_table` sudah pernah dijalankan
 *   (batch 3) SEBELUM baris `meta` ditambahkan ke file tersebut. MySQL tidak
 *   membungkus DDL dalam transaksi, dan Laravel tidak pernah menjalankan ulang
 *   migration yang sudah tercatat "Ran" — sehingga file migrasi dan skema real
 *   menjadi tidak sinkron.
 *
 *   Akibatnya App\Support\AuthLogger menulis kolom `meta` yang tidak ada →
 *   SQLSTATE[42S22] Unknown column 'meta' → respons login 500.
 *
 *   Migration lama TIDAK diedit (sudah pernah dijalankan di lingkungan lain).
 *   Perbaikan dibuat lewat migration baru yang idempoten.
 *
 * Kolom `context` tetap `varchar(20)` — ia menyimpan asal request
 * ('web' / 'api'), bukan data tambahan. Detail tambahan (perangkat, alasan,
 * waktu) disimpan di `meta`.
 */
return new class extends Migration
{
    public const INDEX_EVENT_CREATED_AT = 'auth_logs_event_created_at_index';

    public const INDEX_USER_CREATED_AT = 'auth_logs_user_id_created_at_index';

    public function up(): void
    {
        if (! Schema::hasColumn('auth_logs', 'meta')) {
            Schema::table('auth_logs', function (Blueprint $table): void {
                $table->json('meta')->nullable()->after('context');
            });
        }

        // Migration awal sudah membuat (user_id, created_at); jangan diduplikasi.
        if (! Schema::hasIndex('auth_logs', self::INDEX_USER_CREATED_AT)) {
            Schema::table('auth_logs', function (Blueprint $table): void {
                $table->index(['user_id', 'created_at'], self::INDEX_USER_CREATED_AT);
            });
        }

        if (! Schema::hasIndex('auth_logs', self::INDEX_EVENT_CREATED_AT)) {
            Schema::table('auth_logs', function (Blueprint $table): void {
                $table->index(['event', 'created_at'], self::INDEX_EVENT_CREATED_AT);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasIndex('auth_logs', self::INDEX_EVENT_CREATED_AT)) {
            Schema::table('auth_logs', function (Blueprint $table): void {
                $table->dropIndex(self::INDEX_EVENT_CREATED_AT);
            });
        }

        // Index user_id+created_at sudah ada sejak migration awal — jangan drop.
        if (Schema::hasColumn('auth_logs', 'meta')) {
            Schema::table('auth_logs', function (Blueprint $table): void {
                $table->dropColumn('meta');
            });
        }
    }
};
