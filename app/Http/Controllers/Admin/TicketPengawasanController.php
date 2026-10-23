<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class TicketPengawasanController extends Controller
{
    public function update(Request $request, string $ticketNumber): RedirectResponse
    {
        $request->validate([
            'aktif' => ['required', 'boolean'],
        ]);

        $ticket = Ticket::where('ticket_number', $ticketNumber)->firstOrFail();

        if ($ticket->status === 'selesai') {
            return back()->withErrors(['aktif' => 'Tiket yang sudah selesai tidak dapat diubah kadar pengawasan.']);
        }

        $aktif = $request->boolean('aktif');
        $user = auth()->user();
        $userName = $user?->name ?? 'Petugas';

        if ($aktif) {
            $ticket->update([
                'is_pengawasan' => true,
                'pengawasan_at' => now(),
                'pengawasan_by' => $user?->id,
            ]);

            $ticket->responses()->create([
                'user_id' => $user?->id,
                'type' => 'respon_substantif',
                'is_system' => true,
                'message' => "Kadar pengawasan diaktifkan oleh {$userName}.",
                'sent_at' => now(),
            ]);
        } else {
            $ticket->update([
                'is_pengawasan' => false,
                'pengawasan_at' => null,
                'pengawasan_by' => null,
            ]);

            $ticket->responses()->create([
                'user_id' => $user?->id,
                'type' => 'respon_substantif',
                'is_system' => true,
                'message' => "Kadar pengawasan dinonaktifkan oleh {$userName}.",
                'sent_at' => now(),
            ]);
        }

        Cache::forget('ticket_check:'.md5($ticket->ticket_number));
        Cache::forget("ticket:{$ticket->ticket_number}");
        Cache::forget('dashboard:admin:version');

        return back()->with('success', $aktif ? 'Kadar pengawasan berhasil diaktifkan.' : 'Kadar pengawasan berhasil dinonaktifkan.');
    }
}
