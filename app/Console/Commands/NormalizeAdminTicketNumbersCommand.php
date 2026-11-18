<?php

namespace App\Console\Commands;

use App\Models\Ticket;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NormalizeAdminTicketNumbersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tickets:normalize-admin-numbers
        {--dry-run : Tampilkan pemetaan nomor lama ke baru tanpa mengubah data}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mengubah nomor tiket lama format Administrator/... (dan pola lama lain) menjadi format L-/A-/I-1400/mmyyyy/XX#### sesuai jenis, tanpa membuat nomor urut baru.';

    /**
     * Pola nomor tiket baru yang valid (tanpa delimitar, untuk MySQL REGEXP):
     * L-/A-/I-1400/MMYYYY/KodeHurufUrut.
     */
    private const NEW_FORMAT = '^[LAI]-1400/[0-9]{6}/[A-Z]{2}[0-9]+$';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $candidates = Ticket::where('ticket_number', 'NOT REGEXP', self::NEW_FORMAT)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        if ($candidates->isEmpty()) {
            $this->info('Tidak ada tiket dengan nomor format lama yang perlu dinormalisasi.');

            return Command::SUCCESS;
        }

        $mapping = [];
        $skipped = [];

        foreach ($candidates as $ticket) {
            // Pertahankan tiket yang SUDAH format baru (jaga-jaga bila PERCAKAPAN
            // MySQL REGEXP berbeda dari PHP; jangan sentuh tiket yang baik).
            if (preg_match('#'.self::NEW_FORMAT.'#', $ticket->ticket_number)) {
                continue;
            }

            // Tiket admin seharusnya dibuat tanpa pelapor aktif. Jika ternyata
            // ada email atau nama pelapor, jangan ubah nomor agar bukti pelapor
            // tidak hilang rujukannya.
            if ($ticket->reporter_email !== null || $ticket->reporter_name !== null) {
                $skipped[] = [
                    'id' => $ticket->id,
                    'old' => $ticket->ticket_number,
                    'reason' => 'memiliki pelapor aktif (email/nama terisi)',
                ];

                continue;
            }

            $newNumber = $this->buildNumber($ticket);

            if ($newNumber === $ticket->ticket_number) {
                continue;
            }

            $mapping[] = [
                'id' => $ticket->id,
                'old' => $ticket->ticket_number,
                'new' => $newNumber,
                'classification' => $ticket->classification,
                'sequence' => $ticket->sequence,
                'created_at' => $ticket->created_at?->timezone('Asia/Jakarta')->toIso8601String(),
            ];

            if (! $dryRun) {
                DB::transaction(function () use ($ticket, $newNumber) {
                    $ticket->update(['ticket_number' => $newNumber]);
                });

                Log::info('Tiket dinormalisasi: '.$ticket->ticket_number.' -> '.$newNumber, [
                    'ticket_id' => $ticket->id,
                    'old_ticket_number' => $ticket->ticket_number,
                    'new_ticket_number' => $newNumber,
                ]);
            }
        }

        $this->renderTable($mapping, $skipped, $dryRun);

        if ($dryRun) {
            $this->comment('DRY RUN — tidak ada data yang diubah. Jalankan tanpa --dry-run untuk mengubah di database lokal/dev.');
        } else {
            $this->info(sprintf('%d tiket dinormalisasi.', count($mapping)));
        }

        if ($skipped !== []) {
            $this->warn(sprintf('%d tiket dilewati karena memiliki pelapor aktif (lihat log detail di atas).', count($skipped)));
        }

        return Command::SUCCESS;
    }

    /**
     * Susun nomor baru memakai jenis dan nomor urut yang sudah dimiliki tiket,
     * dengan bulan-tahun dari tanggal pembuatan tiket (Asia/Jakarta).
     */
    private function buildNumber(Ticket $ticket): string
    {
        $meta = Ticket::classificationMeta($ticket->classification);
        $createdAt = $ticket->created_at?->timezone('Asia/Jakarta');
        $month = $createdAt ? $createdAt->format('m') : now('Asia/Jakarta')->format('m');
        $year = $createdAt ? $createdAt->format('Y') : now('Asia/Jakarta')->format('Y');
        $seqFormatted = sprintf('%02d', (int) $ticket->sequence);

        for ($i = 0; $i < 10; $i++) {
            $randomLetters = sprintf('%s%s', chr(random_int(65, 90)), chr(random_int(65, 90)));
            $candidate = sprintf(
                '%s-%s/%s%s/%s%s',
                $meta['prefix'],
                $meta['code'],
                $month,
                $year,
                $randomLetters,
                $seqFormatted,
            );

            if (! Ticket::where('ticket_number', $candidate)->where('id', '!=', $ticket->id)->exists()) {
                return $candidate;
            }
        }

        return sprintf(
            '%s-%s/%s%s/%s%s',
            $meta['prefix'],
            $meta['code'],
            $month,
            $year,
            'ZZ',
            $seqFormatted,
        );
    }

    /**
     * @param  list<array<string, mixed>>  $mapping
     * @param  list<array<string, mixed>>  $skipped
     */
    private function renderTable(array $mapping, array $skipped, bool $dryRun): void
    {
        $columns = ['ID', 'Nomor Lama', 'Nomor Baru', 'Jenis', 'Urut', 'Dibuat'];
        $rows = [];

        foreach ($mapping as $item) {
            $rows[] = [
                $item['id'],
                $item['old'],
                $item['new'],
                $item['classification'],
                $item['sequence'],
                $item['created_at'],
            ];
        }

        if ($rows !== []) {
            $this->table($columns, $rows);
        }

        $this->newLine();
        $this->info(sprintf('%d tiket akan dinormalisasi%s.', count($mapping), $dryRun ? ' (dry run)' : ''));

        if ($skipped !== []) {
            $this->warn('Dilewati (pelapor aktif):');
            foreach ($skipped as $item) {
                $this->line(sprintf('  - #%d %s (%s)', $item['id'], $item['old'], $item['reason']));
            }
        }

        // Catat pemetaan ke file log agar bisa ditelusuri nanti.
        $logFile = storage_path('logs/tickets-normalize-'.now('Asia/Jakarta')->format('Ymd').'.log');
        $entries = [];
        foreach ($mapping as $item) {
            $entries[] = sprintf(
                '[%s] #%d %s -> %s (%s, urut %s)',
                now('Asia/Jakarta')->toIso8601String(),
                $item['id'],
                $item['old'],
                $item['new'],
                $item['classification'],
                $item['sequence'],
            );
        }

        if ($entries !== []) {
            $put = $dryRun ? '[DRY RUN] ' : '';
            file_put_contents($logFile, implode(PHP_EOL, array_map(fn (string $e): string => $put.$e, $entries)).PHP_EOL, FILE_APPEND);
        }
    }
}
