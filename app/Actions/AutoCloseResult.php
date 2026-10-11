<?php

namespace App\Actions;

use App\Models\Ticket;

/**
 * Ringkasan hasil satu eksekusi AutoCloseTickets.
 *
 * Dipakai command (untuk ditampilkan ke operator) dan test (untuk memeriksa
 * kandidat vs benar-benar tertutup).
 */
class AutoCloseResult
{
    /** @var array<int, string> */
    public array $candidates = [];

    /** @var array<int, int> */
    public array $closed = [];

    public static function empty(): self
    {
        return new self;
    }

    public function consider(Ticket $ticket): void
    {
        $this->candidates[] = $ticket->classification.':'.$ticket->ticket_number;
    }

    public function markClosed(int $ticketId): void
    {
        if (! in_array($ticketId, $this->closed, true)) {
            $this->closed[] = $ticketId;
        }
    }

    public function total(): int
    {
        return count($this->candidates);
    }

    public function closedCount(): int
    {
        return count($this->closed);
    }

    /**
     * @return array<string, int>
     */
    public function perClassification(): array
    {
        $counts = [];

        foreach ($this->candidates as $entry) {
            [$classification] = explode(':', $entry, 2);
            $counts[$classification] = ($counts[$classification] ?? 0) + 1;
        }

        return $counts;
    }

    /**
     * @return array<string, int>
     */
    public function closedPerClassification(): array
    {
        $counts = [];

        foreach ($this->closed as $ticketId) {
            $classification = (string) Ticket::query()->whereKey($ticketId)->value('classification');
            $counts[$classification] = ($counts[$classification] ?? 0) + 1;
        }

        return $counts;
    }
}
