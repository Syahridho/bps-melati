<?php

namespace App\Actions;

use App\Events\InboxUpdated;
use App\Events\TicketReplyFromReporter;
use App\Events\TicketUpdated;
use App\Models\Ticket;
use App\Models\TicketResponse;
use App\Support\SafeBroadcast;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Sumber tunggal penyimpanan balasan pelapor (web /check dan API mobile).
 *
 * Sebelumnya kedua controller menduplikasi blok create TicketResponse + update
 * tiket + forget cache, dan hanya jalur web yang menyiarkan event. Dengan
 * dipusatkan di sini, kedua jalur mendapat perilaku yang sama:
 *
 *  1. Tanggapan dan lampiran disimpan dalam satu transaksi.
 *  2. Tiket ditandai belum dibaca dan status selesai/penutupan dibatalkan.
 *  3. Cache halaman publik & versi dashboard dibersihkan.
 *  4. Broadcast dijalankan lewat DB::afterCommit supaya petugas tidak menerima
 *     notifikasi untuk data yang urung tersimpan.
 *  5. Kegagalan broadcaster ditelan SafeBroadcast: balasan pelapor tetap
 *     tersimpan dan request tetap sukses.
 */
class ReplyFromReporter
{
    /**
     * @param  array<int, UploadedFile>  $attachments
     */
    public function handle(Ticket $ticket, string $message, array $attachments = []): TicketResponse
    {
        $response = DB::transaction(function () use ($ticket, $message, $attachments): TicketResponse {
            // Kunci baris tiket: balasan pelapor dan balasan petugas tidak saling
            // menimpa status pada saat yang sama.
            $locked = Ticket::whereKey($ticket->id)->lockForUpdate()->firstOrFail();

            $response = TicketResponse::create([
                'ticket_id' => $locked->id,
                'user_id' => null,
                'type' => 'balasan_pelapor',
                'message' => $message,
                'sent_at' => now(),
            ]);

            foreach ($attachments as $file) {
                $path = $file->store("response_attachments/{$response->id}", 'public');

                $response->attachments()->create([
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                ]);
            }

            // Tandai tiket belum dibaca oleh admin/operator agar muncul di daftar
            // "belum dibaca", dan buka kembali tiket yang sebelumnya selesai.
            $locked->update([
                'is_read' => false,
                'completed_at' => null,
                'closed_reason' => null,
            ]);

            return $response->load(['user', 'attachments']);
        });

        DB::afterCommit(function () use ($ticket, $response): void {
            $ticket = $ticket->fresh() ?? $ticket;

            Cache::forget('ticket_check:'.md5($ticket->ticket_number));
            Cache::forget("ticket:{$ticket->ticket_number}");
            Cache::forget('dashboard:admin:version');

            $context = [
                'ticket_id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'response_id' => $response->id,
            ];

            SafeBroadcast::send('TicketUpdated', fn () => TicketUpdated::dispatch($ticket, $response), $context);
            SafeBroadcast::send('InboxUpdated', fn () => InboxUpdated::dispatch($ticket, 'Pelapor'), $context);
            SafeBroadcast::send('TicketReplyFromReporter', fn () => TicketReplyFromReporter::dispatch($ticket, $response), $context);
        });

        return $response;
    }
}
