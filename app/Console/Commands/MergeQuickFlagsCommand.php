<?php

namespace App\Console\Commands;

use App\Models\AuditFlag;
use App\Models\Ticket;
use App\Support\AuditFlagTimeCalculator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Menggabungkan penanda lama `rating_cepat` ke `selesai_cepat_setelah_balasan`.
 */
class MergeQuickFlagsCommand extends Command
{
    protected $signature = 'audit:merge-quick-flags
        {--dry-run : Simulasi tanpa mengubah database (default)}
        {--force : Terapkan penggabungan ke database}';

    protected $description = 'Gabungkan penanda lama rating_cepat ke selesai_cepat_setelah_balasan tanpa menimpa status/catatan admin.';

    public function handle(): int
    {
        $isDryRun = $this->option('dry-run') || ! $this->option('force');
        $thresholdSeconds = (int) config('audit.flags.selesai_cepat_setelah_balasan.medium_seconds', 600);
        $tz = AuditFlagTimeCalculator::timezone();

        $ratingFlags = AuditFlag::query()
            ->with('ticket')
            ->where('type', AuditFlag::TYPE_RATING_CEPAT)
            ->orderBy('id')
            ->get();

        if ($ratingFlags->isEmpty()) {
            $this->info('Tidak ada penanda rating_cepat yang perlu digabungkan.');

            return self::SUCCESS;
        }

        $ticketIds = $ratingFlags->pluck('ticket_id')->filter()->unique()->values();
        $existingSelesaiByTicket = AuditFlag::query()
            ->where('type', AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN)
            ->whereIn('ticket_id', $ticketIds)
            ->get()
            ->keyBy('ticket_id');

        $rows = [];
        $actions = [];
        $mergedCount = 0;
        $convertedCount = 0;
        $skippedCount = 0;

        foreach ($ratingFlags as $ratingFlag) {
            $ticket = $ratingFlag->ticket;
            $ticketLabel = $ticket?->ticket_number ?? ($ratingFlag->ticket_id ? "#{$ratingFlag->ticket_id}" : '-');

            /** @var AuditFlag|null $selesaiFlag */
            $selesaiFlag = $ratingFlag->ticket_id !== null
                ? $existingSelesaiByTicket->get($ratingFlag->ticket_id)
                : null;

            if ($selesaiFlag !== null) {
                $mergedCount++;
                $rows[] = [
                    $ratingFlag->id,
                    $ticketLabel,
                    'rating_cepat + selesai_cepat_setelah_balasan',
                    "selesai_cepat_setelah_balasan (status: {$this->resolveMergedStatus($selesaiFlag, $ratingFlag)})",
                    'Gabung & hapus rating_cepat',
                ];
                $actions[] = [
                    'kind' => 'merge',
                    'ratingFlag' => $ratingFlag,
                    'selesaiFlag' => $selesaiFlag,
                ];

                continue;
            }

            if (! $this->isClosedTicket($ticket)) {
                $skippedCount++;
                $rows[] = [
                    $ratingFlag->id,
                    $ticketLabel,
                    AuditFlag::TYPE_RATING_CEPAT,
                    AuditFlag::TYPE_RATING_CEPAT,
                    'Dilewati (tiket tidak ditemukan / belum ditutup)',
                ];

                continue;
            }

            $convertedCount++;
            $rows[] = [
                $ratingFlag->id,
                $ticketLabel,
                AuditFlag::TYPE_RATING_CEPAT,
                AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN." (status: {$ratingFlag->status})",
                'Konversi tipe ke selesai_cepat_setelah_balasan',
            ];
            $actions[] = [
                'kind' => 'convert',
                'ratingFlag' => $ratingFlag,
                'ticket' => $ticket,
            ];
        }

        $this->table(['Flag ID', 'Nomor Tiket', 'Sebelum', 'Sesudah', 'Aksi'], $rows);
        $this->line("Ringkasan: {$mergedCount} digabung, {$convertedCount} dikonversi, {$skippedCount} dilewati.");

        if ($isDryRun) {
            $this->warn('Mode dry-run: tidak ada data yang diubah. Jalankan dengan --force untuk menerapkan perubahan.');

            return self::SUCCESS;
        }

        $affected = 0;
        DB::transaction(function () use ($actions, $thresholdSeconds, $tz, &$affected): void {
            foreach ($actions as $action) {
                if ($action['kind'] === 'merge') {
                    /** @var AuditFlag $ratingFlag */
                    $ratingFlag = $action['ratingFlag'];
                    /** @var AuditFlag $selesaiFlag */
                    $selesaiFlag = $action['selesaiFlag'];

                    $mergedStatus = $this->resolveMergedStatus($selesaiFlag, $ratingFlag);
                    $mergedNote = filled($selesaiFlag->review_note) ? $selesaiFlag->review_note : $ratingFlag->review_note;
                    $mergedReviewedBy = $selesaiFlag->reviewed_by ?? $ratingFlag->reviewed_by;
                    $mergedReviewedAt = $selesaiFlag->reviewed_at ?? $ratingFlag->reviewed_at;
                    $mergedExcludeRating = (bool) ($selesaiFlag->exclude_rating || $ratingFlag->exclude_rating);

                    $details = is_array($selesaiFlag->details) ? $selesaiFlag->details : [];
                    unset($details['rated_at']);
                    if (isset($details['catatan']) && is_string($details['catatan'])) {
                        $details['catatan'] = str_replace(' Rating juga diberikan bersamaan.', '', $details['catatan']);
                    }

                    $selesaiFlag->forceFill([
                        'status' => $mergedStatus,
                        'review_note' => $mergedNote,
                        'reviewed_by' => $mergedReviewedBy,
                        'reviewed_at' => $mergedReviewedAt,
                        'exclude_rating' => $mergedExcludeRating,
                        'details' => $details,
                    ])->save();

                    $ratingFlag->delete();
                    $affected++;

                    continue;
                }

                if ($action['kind'] === 'convert') {
                    /** @var AuditFlag $ratingFlag */
                    $ratingFlag = $action['ratingFlag'];
                    /** @var Ticket $ticket */
                    $ticket = $action['ticket'];

                    $details = is_array($ratingFlag->details) ? $ratingFlag->details : [];
                    $actionAt = ($ticket->completed_at ?? $ticket->rated_at)?->copy()->timezone($tz);
                    $replyResponse = $actionAt !== null
                        ? AuditFlagTimeCalculator::findLastStaffResponseBefore($ticket, $actionAt)
                        : null;
                    $replyAt = ($replyResponse?->sent_at ?? $replyResponse?->created_at)?->copy()->timezone($tz);
                    $elapsed = AuditFlagTimeCalculator::elapsedSeconds($replyAt, $actionAt);
                    $sameIp = (bool) ($details['same_ip'] ?? false);

                    if ($elapsed !== null) {
                        $details['selisih_detik'] = AuditFlagTimeCalculator::normalizeSeconds($elapsed);
                        $details['response_id'] = $replyResponse?->id;
                        $details['reply_at'] = $replyAt?->toIso8601String();
                        $details['action_at'] = $actionAt?->toIso8601String();
                        $details['threshold_seconds'] = $thresholdSeconds;
                        $details['catatan'] = AuditFlagTimeCalculator::buildReason(
                            AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN,
                            $elapsed,
                            $thresholdSeconds,
                            $sameIp,
                        );
                    } elseif (isset($details['selisih_detik']) && is_numeric($details['selisih_detik'])) {
                        $details['threshold_seconds'] = $thresholdSeconds;
                        $details['catatan'] = AuditFlagTimeCalculator::buildReason(
                            AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN,
                            (float) $details['selisih_detik'],
                            $thresholdSeconds,
                            $sameIp,
                        );
                    }

                    $ratingFlag->forceFill([
                        'type' => AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN,
                        'details' => $details,
                    ])->save();

                    $affected++;
                }
            }
        });

        AuditFlag::invalidateCache();

        $this->info("Berhasil memproses {$affected} penanda.");

        return self::SUCCESS;
    }

    protected function resolveMergedStatus(AuditFlag $selesaiFlag, AuditFlag $ratingFlag): string
    {
        if ($selesaiFlag->status !== AuditFlag::STATUS_BARU) {
            return $selesaiFlag->status;
        }

        if ($ratingFlag->status !== AuditFlag::STATUS_BARU) {
            return $ratingFlag->status;
        }

        return $selesaiFlag->status;
    }

    protected function isClosedTicket(?Ticket $ticket): bool
    {
        if ($ticket === null) {
            return false;
        }

        return $ticket->status === 'selesai' || $ticket->completed_at !== null;
    }
}
