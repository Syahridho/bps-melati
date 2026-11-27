<?php

namespace App\Console\Commands;

use App\Models\AuditFlag;
use App\Support\AuditFlagTimeCalculator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RecalculateFlagTimesCommand extends Command
{
    protected $signature = 'audit:recalculate-flag-times
        {--dry-run : Simulasi tanpa mengubah database (default)}
        {--force : Terapkan hasil hitung ulang ke database}';

    protected $description = 'Hitung ulang selisih waktu dan alasan sistem pada penanda rating_cepat dan selesai_cepat_setelah_balasan.';

    public function handle(): int
    {
        $isDryRun = $this->option('dry-run') || ! $this->option('force');
        $tz = AuditFlagTimeCalculator::timezone();

        $flags = AuditFlag::query()
            ->with('ticket')
            ->whereIn('type', [
                AuditFlag::TYPE_RATING_CEPAT,
                AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN,
            ])
            ->orderBy('id')
            ->get();

        if ($flags->isEmpty()) {
            $this->info('Tidak ada penanda waktu yang perlu dihitung ulang.');

            return self::SUCCESS;
        }

        $thresholdSeconds = (int) config('audit.flags.selesai_cepat_setelah_balasan.medium_seconds', 600);

        $rows = [];
        $updates = [];

        foreach ($flags as $flag) {
            $ticket = $flag->ticket;
            $details = is_array($flag->details) ? $flag->details : [];
            $oldReason = (string) ($details['catatan'] ?? '-');

            if ($ticket === null) {
                $rows[] = [$flag->id, '-', $flag->type, $oldReason, 'Dilewati (tiket tidak ditemukan)'];

                continue;
            }

            $actionAt = ($ticket->completed_at ?? $ticket->rated_at)?->copy()->timezone($tz);
            $replyResponse = $actionAt !== null
                ? AuditFlagTimeCalculator::findLastStaffResponseBefore($ticket, $actionAt)
                : null;
            $replyAt = ($replyResponse?->sent_at ?? $replyResponse?->created_at)?->copy()->timezone($tz);
            $elapsed = AuditFlagTimeCalculator::elapsedSeconds($replyAt, $actionAt);

            $sameIp = (bool) ($details['same_ip'] ?? false);

            if ($elapsed === null) {
                $newStatus = AuditFlag::STATUS_WAJAR;
                $newNote = 'Auto: dihitung ulang, tidak memenuhi ambang';
                $summary = 'Data waktu tidak lengkap/negatif → wajar';

                $rows[] = [$flag->id, $ticket->ticket_number, $flag->type, $oldReason, $summary];
                $updates[] = [
                    'flag' => $flag,
                    'details' => $details,
                    'status' => $newStatus,
                    'review_note' => $newNote,
                ];

                continue;
            }

            $normalizedSeconds = AuditFlagTimeCalculator::normalizeSeconds($elapsed);
            $newReason = AuditFlagTimeCalculator::buildReason($flag->type, $elapsed, $thresholdSeconds, $sameIp);
            $newDetails = array_merge($details, [
                'selisih_detik' => $normalizedSeconds,
                'response_id' => $replyResponse?->id,
                'reply_at' => $replyAt?->toIso8601String(),
                'action_at' => $actionAt?->toIso8601String(),
                'threshold_seconds' => $thresholdSeconds,
                'same_ip' => $sameIp,
                'catatan' => $newReason,
            ]);

            $exceedsThreshold = $elapsed >= $thresholdSeconds;
            $newStatus = $exceedsThreshold ? AuditFlag::STATUS_WAJAR : $flag->status;
            $newNote = $exceedsThreshold ? 'Auto: dihitung ulang, tidak memenuhi ambang' : $flag->review_note;

            $afterSummary = $exceedsThreshold
                ? "{$newReason} [→ wajar]"
                : $newReason;

            $rows[] = [$flag->id, $ticket->ticket_number, $flag->type, $oldReason, $afterSummary];
            $updates[] = [
                'flag' => $flag,
                'details' => $newDetails,
                'status' => $newStatus,
                'review_note' => $newNote,
            ];
        }

        $this->table(['Flag ID', 'Nomor Tiket', 'Tipe', 'Sebelum', 'Sesudah'], $rows);

        if ($isDryRun) {
            $this->warn('Mode dry-run: tidak ada data yang diubah. Jalankan dengan --force untuk menerapkan perubahan.');

            return self::SUCCESS;
        }

        $updated = 0;
        DB::transaction(function () use ($updates, &$updated): void {
            foreach ($updates as $item) {
                /** @var AuditFlag $flag */
                $flag = $item['flag'];
                $flag->forceFill([
                    'details' => $item['details'],
                    'status' => $item['status'],
                    'review_note' => $item['review_note'],
                ])->save();
                $updated++;
            }
        });

        AuditFlag::invalidateCache();

        $this->info("Berhasil menghitung ulang {$updated} penanda waktu.");

        return self::SUCCESS;
    }
}
