<?php

namespace App\Policies;

use App\Enums\AssignmentMode;
use App\Models\Ticket;
use App\Models\User;

class TicketPolicy
{
    /**
     * Aturan balas terpusat untuk semua jalur (web, API, kanal lain).
     *
     * Perilaku mengikuti mode yang tersimpan pada tiket, bukan mode global.
     */
    public function reply(User $user, Ticket $ticket): bool
    {
        // Status selesai tetap ditangani ReplyToTicket agar pesan 409-nya
        // konsisten; policy ini hanya mengatur siapa yang boleh membalas.
        if ($user->isAdmin()) {
            return true;
        }

        // PIC tiket (termasuk pembuat Input Data) selalu berhak membalas tiketnya sendiri.
        if ($ticket->assigned_to !== null && (int) $ticket->assigned_to === (int) $user->id) {
            return true;
        }

        if (! $user->isOperator()) {
            return false;
        }

        // Mode claim yang belum diambil: operator harus klaim dulu.
        if ($ticket->assignment_mode === AssignmentMode::Claim->value && $ticket->assigned_to === null) {
            return false;
        }

        // Tiket ber-PIC hanya boleh dibalas PIC atau admin.
        if ($ticket->assigned_to !== null) {
            return false;
        }

        // Mode free, atau tiket round robin tanpa kandidat operator.
        return true;
    }

    public function claim(User $user, Ticket $ticket): bool
    {
        return $user->is_active
            && $user->is_available
            && ! $user->trashed()
            && $user->isOperator()
            && $ticket->status !== 'selesai'
            && $ticket->assignment_mode === AssignmentMode::Claim->value
            && $ticket->assigned_to === null;
    }

    public function reassign(User $user, Ticket $ticket): bool
    {
        return $user->isAdmin();
    }

    public function viewAssignmentHistory(User $user, Ticket $ticket): bool
    {
        return $user->isAdmin();
    }
}
