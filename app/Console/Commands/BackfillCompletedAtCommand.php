<?php

namespace App\Console\Commands;

use App\Models\Ticket;
use App\Services\TicketCacheInvalidator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackfillCompletedAtCommand extends Command
{
    protected $signature = 'tickets:backfill-completed-at {--force : Terapkan perubahan ke database (default hanya dry-run)}';

    protected $description = 'Isi completed_at yang kosong pada tiket berstatus selesai secara aman';

    public function handle(): int
    {
        $isForce = (bool) $this->option('force');

        $query = Ticket::query()
            ->where('status', 'selesai')
            ->whereNull('completed_at')
            ->with(['responses' => fn ($q) => $q->latest('id')]);

        $total = (clone $query)->count();

        if ($total === 0) {
            $this->info('Tidak ada tiket berstatus selesai dengan completed_at NULL.');

            return self::SUCCESS;
        }

        $this->info(sprintf(
            'Ditemukan %d tiket selesai dengan completed_at NULL (%s).',
            $total,
            $isForce ? 'MODE FORCE: akan diperbarui' : 'MODE DRY-RUN: tidak ada perubahan DB'
        ));

        $samples = [];
        $updated = 0;

        (clone $query)->orderBy('id')->chunkById(200, function ($tickets) use ($isForce, &$samples, &$updated): void {
            foreach ($tickets as $ticket) {
                $resolvedAt = $ticket->responses->first()?->created_at
                    ?? $ticket->rated_at
                    ?? $ticket->updated_at
                    ?? $ticket->created_at
                    ?? now();

                if (count($samples) < 10) {
                    $samples[] = [
                        $ticket->id,
                        $ticket->ticket_number,
                        $ticket->updated_at?->toDateTimeString() ?? '-',
                        $resolvedAt->toDateTimeString(),
                    ];
                }

                if ($isForce) {
                    $affected = DB::table('tickets')
                        ->where('id', $ticket->id)
                        ->where('status', 'selesai')
                        ->whereNull('completed_at')
                        ->update(['completed_at' => $resolvedAt]);
                    $updated += $affected;
                }
            }
        });

        $this->table(['ID', 'Nomor Tiket', 'updated_at', 'completed_at (hasil)'], $samples);

        if ($isForce) {
            app(TicketCacheInvalidator::class)->invalidateTicket();
            $this->info("Berhasil mengisi completed_at pada {$updated} tiket.");
        } else {
            $this->comment('Jalankan ulang dengan --force untuk menerapkan pembaruan.');
        }

        return self::SUCCESS;
    }
}
