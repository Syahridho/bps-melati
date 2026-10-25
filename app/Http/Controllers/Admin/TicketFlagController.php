<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class TicketFlagController extends Controller
{
    public function update(Request $request, string $ticketNumber): JsonResponse
    {
        $request->validate([
            'aktif' => ['required', 'boolean'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $ticket = Ticket::where('ticket_number', $ticketNumber)->firstOrFail();

        $aktif = $request->boolean('aktif');
        $user = auth()->user();
        $userName = $user?->name ?? 'Petugas';

        if ($aktif) {
            $ticket->update([
                'is_flagged' => true,
                'flagged_at' => now(),
                'flagged_by' => $user?->id,
                'flag_note' => $request->input('note'),
            ]);

            $ticket->responses()->create([
                'user_id' => $user?->id,
                'type' => 'respon_substantif',
                'is_system' => true,
                'message' => "Laporan ditandai oleh {$userName}." . ($request->input('note') ? " Catatan: {$request->input('note')}" : ''),
                'sent_at' => now(),
            ]);
        } else {
            $ticket->update([
                'is_flagged' => false,
                'flagged_at' => null,
                'flagged_by' => null,
                'flag_note' => null,
            ]);

            $ticket->responses()->create([
                'user_id' => $user?->id,
                'type' => 'respon_substantif',
                'is_system' => true,
                'message' => "Tandai laporan dilepas oleh {$userName}.",
                'sent_at' => now(),
            ]);
        }

        Cache::forget('ticket_check:' . md5($ticket->ticket_number));
        Cache::forget("ticket:{$ticket->ticket_number}");

        return response()->json([
            'success' => true,
            'is_flagged' => (bool) $ticket->is_flagged,
            'flagged_at' => $ticket->flagged_at?->toIso8601String(),
            'flagged_by_name' => $aktif ? $userName : null,
            'flag_note' => $ticket->flag_note,
        ]);
    }
}
