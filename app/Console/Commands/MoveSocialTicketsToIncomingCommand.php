<?php

namespace App\Console\Commands;

use App\Models\Ticket;
use App\Services\TicketCacheInvalidator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MoveSocialTicketsToIncomingCommand extends Command
{
    private const CHANNEL_SOURCE_MAP = [
        'sosial-media-youtube' => 'social_youtube',
        'sosial-media-facebook' => 'social_facebook',
        'sosial-media-instagram' => 'social_instagram',
    ];

    protected $signature = 'social:move-to-incoming
        {--dry-run : Tampilkan tiket yang akan dipindahkan tanpa mengubah database (default)}
        {--force : Terapkan pemindahan tiket ke Laporan Masuk secara permanen}';

    protected $description = 'Pindahkan tiket lama hasil import media sosial dari Input Data ke Laporan Masuk.';

    public function handle(TicketCacheInvalidator $cacheInvalidator): int
    {
        $isDryRun = $this->option('dry-run') || ! $this->option('force');

        $candidates = Ticket::query()
            ->with('channel:id,slug,name')
            ->where('source_app', 'admin')
            ->whereNull('created_by')
            ->whereNotNull('external_id')
            ->whereHas('channel', function ($query): void {
                $query->whereIn('slug', array_keys(self::CHANNEL_SOURCE_MAP));
            })
            ->orderBy('id')
            ->get();

        if ($candidates->isEmpty()) {
            $this->info('Tidak ada tiket import sosial media yang perlu dipindahkan.');

            return self::SUCCESS;
        }

        $rows = $candidates->map(fn (Ticket $ticket): array => [
            $ticket->id,
            $ticket->ticket_number,
            $ticket->channel?->slug ?? '-',
            $ticket->source_app,
            self::CHANNEL_SOURCE_MAP[$ticket->channel?->slug ?? ''] ?? 'social',
            $ticket->status,
        ])->all();

        $this->table(
            ['ID', 'Nomor Tiket', 'Kanal', 'source_app Lama', 'source_app Baru', 'Status'],
            $rows
        );

        if ($isDryRun) {
            $this->warn("Mode dry-run: {$candidates->count()} tiket ditemukan. Jalankan dengan --force untuk memindahkan.");

            return self::SUCCESS;
        }

        $moved = 0;

        DB::transaction(function () use ($candidates, &$moved): void {
            foreach ($candidates as $ticket) {
                $targetSource = self::CHANNEL_SOURCE_MAP[$ticket->channel?->slug ?? ''] ?? null;
                if ($targetSource === null) {
                    continue;
                }

                // Update langsung kolom source_app tanpa memicu assignment/counter ulang.
                Ticket::query()
                    ->whereKey($ticket->id)
                    ->where('source_app', 'admin')
                    ->update(['source_app' => $targetSource]);

                $moved++;
            }
        });

        $cacheInvalidator->invalidateTicket();

        $this->info("Berhasil memindahkan {$moved} tiket hasil import sosial media ke Laporan Masuk.");

        return self::SUCCESS;
    }
}
