<?php

namespace App\Http\Controllers;

use App\Actions\AutoCloseTickets;
use App\Events\InboxUpdated;
use App\Events\TicketUpdated;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Support\ReplyDeadline;
use App\Support\SafeBroadcast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\URL;
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
                    'closed_reason' => $t->closed_reason,
                    'auto_close_at' => ReplyDeadline::for($t)?->toIso8601String(),
                    'attachments' => $t->attachments->map(fn ($attachment) => [
                        'id' => $attachment->id,
                        'original_name' => $attachment->original_name,
                        'mime_type' => $attachment->mime_type,
                        'size' => $attachment->size,
                    ])->values()->all(),
                    'responses' => $t->responses
                        ->sortBy(fn ($response) => ($response->sent_at ?? $response->created_at)->getTimestamp())
                        ->values()
                        ->map(function ($response) use ($t) {
                            $isSystem = (bool) $response->is_system;
                            $isReporter = $isSystem || $response->user_id === null || $response->type === 'balasan_pelapor';
                            $userName = $isReporter
                                ? ($t->reporter_name ? $t->reporter_name.' (Pelapor)' : 'Pelapor')
                                : ($response->user?->name ?? 'Petugas BPS');

                            return [
                                'id' => $response->id,
                                'type' => $response->type,
                                'message' => $response->message,
                                'user_name' => $isSystem ? 'Sistem' : $userName,
                                'is_reporter' => $isReporter,
                                'is_system' => $isSystem,
                                'sent_at' => $response->sent_at?->toIso8601String(),
                                'created_at' => $response->created_at->toIso8601String(),
                                'attachments' => $response->attachments->map(fn ($att) => [
                                    'id' => $att->id,
                                    'original_name' => $att->original_name,
                                    'mime_type' => $att->mime_type,
                                    'size' => $att->size,
                                ])->values()->all(),
                            ];
                        })->values()->all(),
                ];
            });

            if ($ticket) {
                $ticketId = $ticket['id'];

                $ticket['attachments'] = array_map(function ($attachment) use ($ticketId) {
                    $attachment['url'] = URL::temporarySignedRoute(
                        'check.attachments.download',
                        now()->addMinutes(30),
                        ['type' => 'ticket', 'id' => $attachment['id'], 'ticket' => $ticketId]
                    );

                    return $attachment;
                }, $ticket['attachments']);

                $ticket['responses'] = array_map(function ($response) use ($ticketId) {
                    $response['attachments'] = array_map(function ($att) use ($ticketId) {
                        $att['url'] = URL::temporarySignedRoute(
                            'check.attachments.download',
                            now()->addMinutes(30),
                            ['type' => 'response', 'id' => $att['id'], 'ticket' => $ticketId]
                        );

                        return $att;
                    }, $response['attachments']);

                    return $response;
                }, $ticket['responses']);
            }
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
            'closed_reason' => null,
        ]);

        Cache::forget('ticket_check:'.md5($ticket->ticket_number));
        Cache::forget("ticket:{$ticket->ticket_number}");

        // Balasan pelapor sudah tersimpan; kegagalan broadcast tidak boleh membalikkan
        // hasil ke pengguna (event dikirim inline, tanpa antrean).
        SafeBroadcast::send('TicketUpdated', fn () => TicketUpdated::dispatch($ticket, $response->load(['user', 'attachments'])), [
            'ticket_id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'response_id' => $response->id,
        ]);
        SafeBroadcast::send('InboxUpdated', fn () => InboxUpdated::dispatch($ticket, 'Pelapor'), [
            'ticket_id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'response_id' => $response->id,
        ]);

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
                'closed_reason' => 'reporter',
            ]);

            Cache::forget('ticket_check:'.md5($ticket->ticket_number));
            Cache::forget("ticket:{$ticket->ticket_number}");

            // InboxUpdated -> badge & angka tab daftar Laporan Masuk.
            // TicketUpdated -> halaman detail tiket yang sedang dibuka petugas
            // ikut tahu tiket ini baru saja diselesaikan pelapor.
            $context = ['ticket_id' => $ticket->id, 'ticket_number' => $ticket->ticket_number];

            SafeBroadcast::send('InboxUpdated', fn () => InboxUpdated::dispatch($ticket, 'Pelapor'), $context);
            SafeBroadcast::send('TicketUpdated', fn () => TicketUpdated::dispatch($ticket), $context);
        }

        return redirect()->back()->with('flash', [
            'success' => 'Laporan telah ditandai selesai. Terima kasih!',
        ]);
    }
}
