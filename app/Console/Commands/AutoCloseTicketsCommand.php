<?php

namespace App\Console\Commands;

use App\Models\Ticket;
use Illuminate\Console\Command;

class AutoCloseTicketsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tickets:auto-close';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Otomatis menandai tiket yang telah dibalas petugas namun tidak ada respon pelapor hingga batas hari yang ditentukan.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $closed = Ticket::autoCloseExpiredTickets();
        $this->info("Berhasil menutup {$closed} tiket yang kedaluwarsa.");

        return Command::SUCCESS;
    }
}
