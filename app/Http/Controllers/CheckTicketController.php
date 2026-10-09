<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CheckTicketController extends Controller
{
    /**
     * Tampilkan halaman publik untuk cek tiket.
     */
    public function __invoke(Request $request): Response
    {
        $ticketNumber = trim((string) $request->query('ticket_number', ''));
        $ticket = null;
        $searched = false;

        if ($ticketNumber !== '') {
            $searched = true;

            $cacheKey = 'ticket_check:'.md5($ticketNumber);

            $ticket = Cache::remember($cacheKey, now()->addMinutes(30), function () use ($ticketNumber) {
                $t = Ticket::with(['channel', 'attachments', 'responses.user', 'responses.attachments'])
                    ->where('ticket_number', $ticketNumber)
                    ->first();

                if (! $t) {
                    return null;
                }

                $t->checkAndAutoClose();

                return [
                    'id' => $t->id,
                    'ticket_number' => $t->ticket_number,
                    'classification' => $t->classification,
                    'title' => $t->title,
                    'service_type' => $t->service_type,
                    'satuan_tugas' => $t->satuan_tugas,
                    'reporter_name' => $t->reporter_name,
                    'content' => $t->content,
                    'status' => $t->status,
                    'channel' => $t->channel?->name ?? '-',
                    'created_at' => $t->created_at->toIso8601String(),
                    'completed_at' => $t->completed_at?->toIso8601String(),
                    'attachments' => $t->attachments->map(fn ($attachment) => [
                        'id' => $attachment->id,
                        'original_name' => $attachment->original_name,
                        'mime_type' => $attachment->mime_type,
                        'size' => $attachment->size,
                        'url' => Storage::url($attachment->path),
                    ])->values()->all(),
                    'responses' => $t->responses
                        ->sortBy(fn ($response) => ($response->sent_at ?? $response->created_at)->getTimestamp())
                        ->values()
                        ->map(function ($response) use ($t) {
                            $isReporter = $response->user_id === null || $response->type === 'balasan_pelapor';
                            $userName = $isReporter
                                ? ($t->reporter_name ? $t->reporter_name.' (Pelapor)' : 'Pelapor')
                                : ($response->user?->name ?? 'Petugas BPS');

                            return [
                                'id' => $response->id,
                                'type' => $response->type,
                                'message' => $response->message,
                                'user_name' => $userName,
                                'is_reporter' => $isReporter,
                                'sent_at' => $response->sent_at?->toIso8601String(),
                                'created_at' => $response->created_at->toIso8601String(),
                                'attachments' => $response->attachments->map(fn ($att) => [
                                    'id' => $att->id,
                                    'original_name' => $att->original_name,
                                    'mime_type' => $att->mime_type,
                                    'size' => $att->size,
                                    'url' => Storage::url($att->path),
                                ])->values()->all(),
                            ];
                        })->values()->all(),
                ];
            });
        }

        return Inertia::render('check', [
            'ticketNumber' => $ticketNumber,
            'ticket' => $ticket,
            'searched' => $searched,
        ]);
    }

    /**
     * Pelapor membalas tanggapan dari petugas BPS.
     */
    public function reply(Request $request, string $ticketNumber): RedirectResponse
    {
        $ticket = Ticket::where('ticket_number', $ticketNumber)->firstOrFail();

        if ($ticket->status === 'selesai') {
            return redirect()->back()->withErrors([
                'message' => 'Tiket telah selesai dan tidak dapat dibalas.',
            ]);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'min:5'],
            'attachments' => ['nullable', 'array', 'max:3'],
            'attachments.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:2048'],
        ]);

        $response = TicketResponse::create([
            'ticket_id' => $ticket->id,
            'user_id' => null,
            'type' => 'balasan_pelapor',
            'message' => $validated['message'],
            'sent_at' => now(),
        ]);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store("response_attachments/{$response->id}", 'public');

                $response->attachments()->create([
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                ]);
            }
        }

        // Tandai tiket belum dibaca oleh admin/operator agar muncul pemberitahuan
        $ticket->update([
            'is_read' => false,
            'completed_at' => null,
        ]);

        Cache::forget('ticket_check:'.md5($ticket->ticket_number));
        Cache::forget("ticket:{$ticket->ticket_number}");

        return redirect()->back()->with('flash', [
            'success' => 'Balasan Anda berhasil terkirim!',
        ]);
    }

    /**
     * Pelapor menandai laporan sebagai selesai.
     */
    public function complete(Request $request, string $ticketNumber): RedirectResponse
    {
        $ticket = Ticket::where('ticket_number', $ticketNumber)->firstOrFail();

        if ($ticket->status !== 'selesai') {
            $ticket->update([
                'status' => 'selesai',
                'completed_at' => now(),
            ]);

            Cache::forget('ticket_check:'.md5($ticket->ticket_number));
            Cache::forget("ticket:{$ticket->ticket_number}");
        }

        return redirect()->back()->with('flash', [
            'success' => 'Laporan telah ditandai selesai. Terima kasih!',
        ]);
    }
}
