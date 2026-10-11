<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Membersihkan current_session_id milik sesi yang sudah tidak ada / basi.
 *
 * Dipanggil tiap menit sebagai jaring pengaman. Ambang waktu tetap menjadi
 * penentu utama; perintah ini hanya mencegah kolom pada user tidak pernah
 * bersih bila browser ditutup tanpa logout dan tidak ada login baru.
 */
class CleanupStaleSessionsCommand extends Command
{
    protected $signature = 'sessions:cleanup {--threshold= : Ambang menit sesi dianggap basi}';

    protected $description = 'Kosongkan current_session_id untuk sesi yang sudah basi atau berakhir.';

    public function handle(): int
    {
        $threshold = (int) ($this->option('threshold') ?: config('session_policy.active_threshold_minutes', 5));
        $cutoff = now()->subMinutes($threshold);

        $stale = User::whereNotNull('current_session_id')
            ->where(function ($query) use ($cutoff) {
                $query->whereNull('last_activity_at')->orWhere('last_activity_at', '<=', $cutoff);
            })
            ->pluck('id');

        if ($stale->isNotEmpty()) {
            User::whereIn('id', $stale)->update([
                'current_session_id' => null,
                'last_activity_at' => null,
                'updated_at' => now(),
            ]);
        }

        $this->info('Sesi basi dibersihkan: '.$stale->count());

        Log::info('Pembersihan sesi basi.', ['count' => $stale->count(), 'threshold_minutes' => $threshold]);

        return self::SUCCESS;
    }
}
