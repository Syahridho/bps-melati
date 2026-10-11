<?php

namespace App\Console\Commands;

use App\Actions\AutoCloseTickets;
use App\Events\InboxChanged;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class AutoCloseTicketsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tickets:auto-close
        {--dry-run : Tampilkan kandidat yang akan ditutup tanpa mengubah data}
        {--limit= : Batasi jumlah tiket yang diproses pada eksekusi ini}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Otomatis menandai tiket yang telah dibalas petugas namun tidak ada respon pelapor hingga batas hari yang ditentukan.';

    /**
     * Execute the console command.
     */
    public function handle(AutoCloseTickets $action): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $limitOption = $this->option('limit');
        $limit = is_numeric($limitOption) ? max(0, (int) $limitOption) : null;

        if ($limit === 0) {
            $this->warn('LIMIT=0, tidak ada tiket yang diproses.');

            return Command::SUCCESS;
        }

        try {
            $result = $action->handle($limit, $dryRun);
        } catch (Throwable $e) {
            report($e);

            Log::error('Proses auto close gagal dijalankan.', [
                'error' => $e->getMessage(),
            ]);

            $this->error('Gagal menjalankan auto close: '.$e->getMessage());

            return Command::FAILURE;
        }

        $windows = $action->resolveWindows();

        if ($windows === []) {
            $this->warn('Auto close dimatikan atau pengaturan kosong untuk seluruh klasifikasi.');

            return Command::SUCCESS;
        }

        foreach ($windows as $classification => $days) {
            $this->line(sprintf('  %-22s %d hari', $classification, $days));
        }

        $this->newLine();

        if ($result->candidates === []) {
            $this->info('Tidak ada tiket yang perlu ditutup otomatis.');

            return Command::SUCCESS;
        }

        if ($dryRun) {
            $this->comment('DRY RUN — kandidat yang AKAN ditutup:');

            foreach ($result->candidates as $candidate) {
                $this->line('  - '.$candidate);
            }

            $this->newLine();
            $this->info(sprintf('%d tiket akan ditutup (tidak ada data yang diubah).', $result->total()));

            return Command::SUCCESS;
        }

        if ($result->closed === []) {
            $this->info(sprintf('%d kandidat ditemukan tetapi tidak ada yang berhasil ditutup.', $result->total()));

            return Command::SUCCESS;
        }

        $this->info(sprintf('Berhasil menutup %d tiket secara otomatis.', $result->closedCount()));

        // Satu event untuk seluruh batch supaya halaman inbox tidak dibanjiri.
        InboxChanged::dispatch('auto_closed', $result->closed, $result->closedCount());

        return Command::SUCCESS;
    }
}
