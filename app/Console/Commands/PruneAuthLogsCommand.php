<?php

namespace App\Console\Commands;

use App\Models\AuthLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Membersihkan audit log autentikasi yang sudah melewati retensi.
 */
class PruneAuthLogsCommand extends Command
{
    protected $signature = 'auth:prune-logs {--days= : Umur retensi dalam hari}';

    protected $description = 'Hapus audit log autentikasi yang melewati masa retensi.';

    public function handle(): int
    {
        $days = (int) ($this->option('days') ?: config('session_policy.audit_retention_days', 90));

        $deleted = AuthLog::where('created_at', '<', now()->subDays($days))->delete();

        $this->info("Auth log: {$deleted} baris dihapus (retensi {$days} hari).");

        Log::info('Audit log autentikasi dipangkas.', ['deleted' => $deleted, 'retention_days' => $days]);

        return self::SUCCESS;
    }
}
