<?php

namespace App\Console\Commands;

use App\Models\AuditFlag;
use App\Support\ClientIpResolver;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixLoopbackAuditFlagsCommand extends Command
{
    protected $signature = 'audit:fix-loopback-flags
        {--dry-run : Simulasi tanpa mengubah database (default)}
        {--force : Tandai penanda jaringan_sama loopback/kosong sebagai wajar secara permanen}';

    protected $description = 'Tandai penanda jaringan_sama lama yang memiliki IP loopback/kosong sebagai wajar.';

    public function handle(): int
    {
        $isDryRun = $this->option('dry-run') || ! $this->option('force');

        $candidates = AuditFlag::query()
            ->with('ticket:id,ticket_number')
            ->where('type', AuditFlag::TYPE_JARINGAN_SAMA)
            ->where('status', '!=', AuditFlag::STATUS_WAJAR)
            ->orderBy('id')
            ->get()
            ->filter(function (AuditFlag $flag): bool {
                $details = is_array($flag->details) ? $flag->details : [];
                $reporterIp = ClientIpResolver::normalize(isset($details['reporter_ip']) ? (string) $details['reporter_ip'] : null);
                $picIp = ClientIpResolver::normalize(isset($details['pic_ip']) ? (string) $details['pic_ip'] : null);

                return $reporterIp === null
                    || $picIp === null
                    || ClientIpResolver::isLoopback($reporterIp)
                    || ClientIpResolver::isLoopback($picIp);
            })
            ->values();

        if ($candidates->isEmpty()) {
            $this->info('Tidak ada penanda jaringan_sama dengan IP loopback/kosong yang perlu diperbaiki.');

            return self::SUCCESS;
        }

        $rows = $candidates->map(function (AuditFlag $flag): array {
            $details = is_array($flag->details) ? $flag->details : [];

            return [
                $flag->id,
                $flag->ticket?->ticket_number ?? '-',
                $details['reporter_ip'] ?? '-',
                $details['pic_ip'] ?? '-',
                $flag->status,
            ];
        })->all();

        $this->table(
            ['Flag ID', 'Nomor Tiket', 'IP Pelapor', 'IP PIC', 'Status Saat Ini'],
            $rows
        );

        if ($isDryRun) {
            $this->warn("Mode dry-run: {$candidates->count()} penanda ditemukan. Jalankan dengan --force untuk menandai sebagai wajar.");

            return self::SUCCESS;
        }

        $note = 'Auto: IP loopback (salah konfigurasi proxy)';
        $updated = 0;

        DB::transaction(function () use ($candidates, $note, &$updated): void {
            foreach ($candidates as $flag) {
                $flag->forceFill([
                    'status' => AuditFlag::STATUS_WAJAR,
                    'review_note' => $note,
                ])->save();

                $updated++;
            }
        });

        AuditFlag::invalidateCache();

        $this->info("Berhasil menandai {$updated} penanda jaringan_sama loopback sebagai wajar.");

        return self::SUCCESS;
    }
}
