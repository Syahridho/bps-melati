<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\SetBerkadarPengawasanRequest;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

class SetTicketBerkadarPengawasan extends Controller
{
    public function __invoke(SetBerkadarPengawasanRequest $request, string $ticketNumber): JsonResponse|RedirectResponse
    {
        $ticket = Ticket::where('ticket_number', $ticketNumber)->lockForUpdate()->firstOrFail();

        if ($ticket->status === 'selesai') {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tiket yang sudah selesai tidak dapat diubah status berkadar pengawasannya.',
                ], 409);
            }
            return back()->withErrors(['berkadar_pengawasan' => 'Tiket yang sudah selesai tidak dapat diubah status berkadar pengawasannya.']);
        }

        $enabled = (bool) $request->validated('enabled');

        if ($ticket->berkadar_pengawasan !== $enabled) {
            $ticket->berkadar_pengawasan = $enabled;
            $ticket->berkadar_pengawasan_by = $request->user()->id;
            $ticket->berkadar_pengawasan_at = now();
            $ticket->timestamps = false;
            $ticket->save();
            $ticket->timestamps = true;
        }

        $ticket->load('berkadarPengawasanModifier');

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Status berkadar pengawasan diperbarui.',
                'data' => [
                    'berkadar_pengawasan' => $ticket->berkadar_pengawasan,
                    'berkadar_pengawasan_by_name' => $ticket->berkadarPengawasanModifier?->name,
                    'berkadar_pengawasan_at' => $ticket->berkadar_pengawasan_at?->toIso8601String(),
                ],
            ]);
        }

        return back()->with('success', 'Status berkadar pengawasan diperbarui.');
    }
}
