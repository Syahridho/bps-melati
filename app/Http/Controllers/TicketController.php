<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTicketRequest;
use App\Models\Ticket;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;

class TicketController extends Controller
{
    public function store(StoreTicketRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $period = now()->format('Y-m');

        $generated = Ticket::generateTicketNumber(
            $validated['classification'],
            $period
        );

        // Buat tiket di database
        $ticket = Ticket::create([
            'ticket_number' => $generated['ticket_number'],
            'period' => $period,
            'sequence' => $generated['sequence'],
            'classification' => $validated['classification'],
            'channel_id' => 1, // Default channel (SP4N-LAPOR!)
            'reporter_name' => $validated['reporter_name'] ?? null,
            'reporter_email' => $validated['reporter_email'] ?? null,
            'reporter_wa' => $validated['reporter_wa'] ?? null,
            'content' => $validated['content'],
            'status' => 'baru',
            'is_read' => false,
            'source_app' => 'web',
        ]);

        // Simpan data sementara di Redis (cache) selama 24 jam
        $cacheKey = "ticket:{$ticket->ticket_number}";
        Cache::put($cacheKey, [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'classification' => $ticket->classification,
            'reporter_name' => $ticket->reporter_name,
            'status' => $ticket->status,
            'created_at' => $ticket->created_at->toDateTimeString(),
        ], now()->addHours(24));

        return redirect()->back()->with([
            'ticket_number' => $ticket->ticket_number,
        ]);
    }
}
