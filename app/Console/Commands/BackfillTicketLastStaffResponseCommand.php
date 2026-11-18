<?php

namespace App\Console\Commands;

use App\Models\Ticket;
use Illuminate\Console\Command;

class BackfillTicketLastStaffResponseCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * Default runs as dry-run unless --execute is specified.
     * --dry-run is also explicitly supported.
     *
     * @var string
     */
    protected $signature = 'tickets:backfill-last-staff-response
        {--dry-run : Jalankan simulasi tanpa mengubah data (default)}
        {--execute : Terapkan perubahan pada basis data}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mengisi kolom last_staff_response_at untuk tiket yang sudah pernah direspon petugas namun kolomnya masih kosong.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $isExecute = (bool) $this->option('execute');
        $isDryRun = (bool) $this->option('dry-run');

        // Mode dry-run aktif jika --dry-run diberikan ATAU --execute tidak diberikan (default aman)
        $dryRun = $isDryRun || ! $isExecute;

        $tickets = Ticket::query()
            ->whereNull('last_staff_response_at')
            ->whereHas('responses', function ($query): void {
                $query->whereNotNull('user_id')
                    ->where('is_system', false);
            })
            ->with(['responses' => function ($query): void {
                $query->whereNotNull('user_id')
                    ->where('is_system', false)
                    ->orderByDesc('sent_at')
                    ->orderByDesc('created_at')
                    ->orderByDesc('id');
            }])
            ->get();

        if ($tickets->isEmpty()) {
            $this->info('Tidak ada tiket yang perlu diperbarui.');

            return Command::SUCCESS;
        }

        if ($dryRun) {
            $this->comment('DRY RUN — tiket yang AKAN diperbarui kolom last_staff_response_at:');
        } else {
            $this->info('Memperbarui kolom last_staff_response_at untuk tiket:');
        }

        $count = 0;
        foreach ($tickets as $ticket) {
            $latestResponse = $ticket->responses->first();
            if ($latestResponse === null) {
                continue;
            }

            $timestamp = $latestResponse->sent_at ?? $latestResponse->created_at;
            if ($timestamp === null) {
                continue;
            }

            $this->line(sprintf(
                '  - [%s] %s -> last_staff_response_at: %s',
                $ticket->id,
                $ticket->ticket_number,
                $timestamp->toIso8601String()
            ));

            if (! $dryRun) {
                $ticket->update(['last_staff_response_at' => $timestamp]);
            }

            $count++;
        }

        $this->newLine();

        if ($dryRun) {
            $this->info(sprintf('%d tiket terdeteksi (tidak ada data yang diubah). Gunakan --execute untuk menerapkan.', $count));
        } else {
            $this->info(sprintf('Berhasil memperbarui kolom last_staff_response_at untuk %d tiket.', $count));
        }

        return Command::SUCCESS;
    }
}
