<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Inertia\Inertia;
use Inertia\Response;

class LaporanMasukController extends Controller
{
    /**
     * Daftar laporan masuk.
     */
    public function index(): Response
    {
        $tickets = Ticket::with('channel')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Ticket $ticket) => [
                'id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'classification' => $ticket->classification,
                'reporter_name' => $ticket->reporter_name,
                'reporter_email' => $ticket->reporter_email,
                'reporter_wa' => $ticket->reporter_wa,
                'content' => $ticket->content,
                'status' => $ticket->status,
                'is_read' => $ticket->is_read,
                'source_app' => $ticket->source_app,
                'channel' => $ticket->channel?->name ?? '-',
                'created_at' => $ticket->created_at->toDateTimeString(),
            ]);

        return Inertia::render('admin/laporan-masuk', [
            'tickets' => $tickets,
        ]);
    }

    /**
     * Detail satu laporan berdasarkan ticket_number.
     *
     * ticket_number mengandung slash (contoh: L-1400/09/2026/0001)
     * sehingga dikirim sebagai catch-all parameter dari route.
     */
    public function show(string $ticketNumber): Response
    {
        $ticket = Ticket::with('channel', 'creator')
            ->where('ticket_number', $ticketNumber)
            ->firstOrFail();

        // Tandai sudah dibaca
        if (! $ticket->is_read) {
            $ticket->update(['is_read' => true]);
        }

        return Inertia::render('admin/laporan-masuk/show', [
            'ticket' => [
                'id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'period' => $ticket->period,
                'sequence' => $ticket->sequence,
                'classification' => $ticket->classification,
                'service_type' => $ticket->service_type,
                'reporter_name' => $ticket->reporter_name,
                'reporter_email' => $ticket->reporter_email,
                'reporter_wa' => $ticket->reporter_wa,
                'content' => $ticket->content,
                'status' => $ticket->status,
                'is_read' => $ticket->is_read,
                'source_app' => $ticket->source_app,
                'channel' => $ticket->channel?->name ?? '-',
                'created_by_name' => $ticket->creator?->name,
                'completed_at' => $ticket->completed_at?->toDateTimeString(),
                'created_at' => $ticket->created_at->toDateTimeString(),
                'updated_at' => $ticket->updated_at->toDateTimeString(),
            ],
        ]);
    }
}
