<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\TicketResponseSubmitted;
use App\Models\Ticket;
use App\Models\TicketResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class TicketResponseController extends Controller
{
    /**
     * Simpan respon (respon awal / respon substantif) untuk tiket.
     */
    public function store(Request $request, Ticket $ticket): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:respon_awal,respon_substantif'],
            'message' => ['required', 'string', 'min:10'],
            'attachments' => ['nullable', 'array', 'max:3'],
            'attachments.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:2048'],
        ]);

        $response = TicketResponse::create([
            'ticket_id' => $ticket->id,
            'user_id' => auth()->id(),
            'type' => $validated['type'],
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

        // Update status tiket sesuai jenis respon dan catat completed_at
        $ticket->update([
            'status' => $validated['type'],
            'completed_at' => $ticket->completed_at ?? now(),
        ]);

        // Cache response di Redis selama 24 jam
        $cacheKey = "response:{$response->id}";
        Cache::put($cacheKey, [
            'id' => $response->id,
            'ticket_id' => $ticket->id,
            'type' => $response->type,
            'message' => $response->message,
            'user' => auth()->user()->name,
            'sent_at' => $response->sent_at->toDateTimeString(),
        ], now()->addHours(24));

        // Kirim email tanggapan ke pelapor via SMTP jika alamat email tersedia
        if (! empty($ticket->reporter_email)) {
            try {
                Mail::to($ticket->reporter_email)
                    ->send(new TicketResponseSubmitted($ticket, $response->load('attachments')));

                $response->update(['email_sent_at' => now()]);
            } catch (\Throwable $e) {
                Log::error("Gagal mengirim email tanggapan ke {$ticket->reporter_email}: {$e->getMessage()}", [
                    'ticket_id' => $ticket->id,
                    'response_id' => $response->id,
                ]);
            }
        }

        return redirect()->back()->with('flash', [
            'success' => 'Respon berhasil dikirim!',
        ]);
    }
}
