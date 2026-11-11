<?php

namespace App\Http\Controllers;

use App\Events\TicketCreated;
use App\Http\Requests\StoreTicketRequest;
use App\Mail\TicketCreatedMail;
use App\Models\Ticket;
use App\Models\User;
use App\UserRole;
use App\Notifications\LaporanNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

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
            'title' => $validated['title'],
            'service_type' => $validated['service_type'] ?? null,
            'satuan_tugas' => $validated['satuan_tugas'] ?? null,
            'channel_id' => $validated['channel_id'],
            'reporter_name' => $validated['reporter_name'] ?? null,
            'reporter_email' => $validated['reporter_email'] ?? null,
            'reporter_wa' => $validated['reporter_wa'] ?? null,
            'content' => $validated['content'],
            'status' => 'baru',
            'is_read' => false,
            'source_app' => 'web',
        ]);

        // Simpan lampiran jika ada
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store("attachments/{$ticket->id}", 'public');

                $ticket->attachments()->create([
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                ]);
            }
        }

        // Simpan data sementara di Redis (cache) selama 24 jam
        $cacheKey = "ticket:{$ticket->ticket_number}";
        Cache::put($cacheKey, [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'classification' => $ticket->classification,
            'service_type' => $ticket->service_type,
            'satuan_tugas' => $ticket->satuan_tugas,
            'reporter_name' => $ticket->reporter_name,
            'status' => $ticket->status,
            'created_at' => $ticket->created_at->toIso8601String(),
        ], now()->addHours(24));

        // Dispatch event real-time broadcasting ke admin
        TicketCreated::dispatch($ticket);

        // Notifikasi laporan masuk ke admin dan semua operator aktif (database + broadcast).
        $data = [
            'ticket_number' => $ticket->ticket_number,
            'type' => $ticket->classification,
            'title' => 'Laporan baru masuk',
            'message' => Str::limit((string) $ticket->title ?? (string) $ticket->content, 100),
            'url' => '/dashboard/admin/laporan-masuk/' . $ticket->ticket_number,
            'actor_name' => $ticket->reporter_name ?? null,
        ];

        $recipients = User::query()
            ->where('is_active', true)
            ->whereIn('role', [UserRole::Admin, UserRole::Operator, UserRole::OperatorTim])
            ->get();

        foreach ($recipients as $recipient) {
            Log::info('[PUSH-TIMING] T0 dispatch notify', [
                'ticket_number' => $ticket->ticket_number,
                'user_id' => $recipient->id,
                'user_role' => $recipient->role,
                't0' => now()->format('Y-m-d H:i:s.u'),
            ]);
            $recipient->notify((new LaporanNotification('laporan_masuk', $data, [$recipient->id]))->onQueue('push'));
        }

        if (! blank($ticket->reporter_email)) {
            Mail::to($ticket->reporter_email)->queue(new TicketCreatedMail($ticket));
        }

        return redirect()->back()->with([
            'ticket_number' => $ticket->ticket_number,
        ]);
    }
}
