<?php

namespace App\Http\Controllers\Api;

use App\Events\TicketCreated;
use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class TicketApiController extends Controller
{
    /**
     * POST /api/tickets
     * Buat tiket baru dari aplikasi (Flutter/API).
     */
    public function store(Request $request): JsonResponse
    {
        // Temukan ID channel default website bila tidak dikirim
        $websiteChannelId = Channel::where('slug', 'website')->value('id');
        $channelId = $request->input('channel_id') ?? $websiteChannelId;

        // Validasi input ketat (Anti-Spam & Anti-SQL Injection)
        $validator = Validator::make(array_merge($request->all(), ['channel_id' => $channelId]), [
            'classification' => ['required', 'string', 'in:pengaduan,aspirasi,permintaan_informasi'],
            'title' => ['required', 'string', 'min:3', 'max:255'],
            'channel_id' => ['required', 'integer', 'exists:channels,id'],
            'reporter_name' => ['nullable', 'string', 'max:255'],
            'reporter_email' => ['nullable', 'email', 'max:255'],
            'reporter_wa' => ['nullable', 'string', 'regex:/^[0-9]+$/', 'max:30'],
            'content' => ['required', 'string', 'min:10'],
            'service_type' => ['nullable', 'string', 'in:pst,lainnya'],
            'satuan_tugas' => ['nullable', 'string', 'max:255'],
            'source_app' => ['nullable', 'string', 'max:20'],
            'attachments' => ['nullable', 'array', 'max:3'],
            'attachments.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:2048'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $period = now()->format('Y-m');

        // Buat nomor tiket secara aman dan sekuensial
        $generated = Ticket::generateTicketNumber(
            $validated['classification'],
            $period
        );

        $sourceApp = ! empty($validated['source_app']) ? trim($validated['source_app']) : 'flutter';

        // Buat tiket (Eloquent PDO Parameter Binding mencegah SQL Injection)
        $ticket = Ticket::create([
            'ticket_number' => $generated['ticket_number'],
            'period' => $period,
            'sequence' => $generated['sequence'],
            'classification' => $validated['classification'],
            'title' => trim($validated['title']),
            'service_type' => $validated['service_type'] ?? null,
            'satuan_tugas' => $validated['satuan_tugas'] ?? null,
            'channel_id' => $validated['channel_id'],
            'reporter_name' => ! empty($validated['reporter_name']) ? trim($validated['reporter_name']) : null,
            'reporter_email' => ! empty($validated['reporter_email']) ? trim($validated['reporter_email']) : null,
            'reporter_wa' => ! empty($validated['reporter_wa']) ? trim($validated['reporter_wa']) : null,
            'content' => trim($validated['content']),
            'status' => 'baru',
            'is_read' => false,
            'source_app' => $sourceApp,
        ]);

        // Simpan lampiran jika ada
        $attachmentsData = [];
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store("attachments/{$ticket->id}", 'public');

                $attachment = $ticket->attachments()->create([
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                ]);

                $attachmentsData[] = [
                    'id' => $attachment->id,
                    'original_name' => $attachment->original_name,
                    'mime_type' => $attachment->mime_type,
                    'size' => $attachment->size,
                    'url' => Storage::url($attachment->path),
                ];
            }
        }

        // Simpan cache sementara
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

        Cache::forget('dashboard:admin:version');
        TicketCreated::dispatch($ticket);

        return response()->json([
            'success' => true,
            'message' => 'Tiket berhasil dibuat.',
            'data' => [
                'id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'access_code' => $ticket->access_code,
                'classification' => $ticket->classification,
                'title' => $ticket->title,
                'status' => $ticket->status,
                'created_at' => $ticket->created_at->toIso8601String(),
                'attachments' => $attachmentsData,
            ],
        ], 201);
    }

    /**
     * GET /api/check or GET /api/check/{ticketNumber}
     * Cek status tiket berdasarkan nomor tiket.
     */
    public function check(Request $request, ?string $ticketNumber = null): JsonResponse
    {
        $targetTicketNumber = trim((string) ($ticketNumber ?? $request->query('ticket_number', '')));

        if ($targetTicketNumber === '') {
            return response()->json([
                'success' => false,
                'message' => 'Parameter ticket_number wajib diisi.',
            ], 400);
        }

        // Validasi format parameter untuk mencegah input aneh/malformed
        if (strlen($targetTicketNumber) > 100) {
            return response()->json([
                'success' => false,
                'message' => 'Format nomor tiket tidak valid.',
            ], 400);
        }

        $ticket = Ticket::with(['channel', 'attachments', 'responses.user', 'responses.attachments'])
            ->where('ticket_number', $targetTicketNumber)
            ->first();

        if (! $ticket) {
            return response()->json([
                'success' => false,
                'message' => 'Nomor tiket tidak ditemukan.',
            ], 404);
        }

        $ticket->checkAndAutoClose();

        $data = [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'classification' => $ticket->classification,
            'title' => $ticket->title,
            'service_type' => $ticket->service_type,
            'satuan_tugas' => $ticket->satuan_tugas,
            'reporter_name' => $ticket->reporter_name,
            'content' => $ticket->content,
            'status' => $ticket->status,
            'channel' => $ticket->channel?->name ?? '-',
            'created_at' => $ticket->created_at->toIso8601String(),
            'completed_at' => $ticket->completed_at?->toIso8601String(),
            'attachments' => $ticket->attachments->map(fn ($attachment) => [
                'id' => $attachment->id,
                'original_name' => $attachment->original_name,
                'mime_type' => $attachment->mime_type,
                'size' => $attachment->size,
                'url' => Storage::url($attachment->path),
            ])->values()->all(),
            'responses' => $ticket->responses->sortByDesc('created_at')->values()->map(function ($response) use ($ticket) {
                $isReporter = $response->user_id === null || $response->type === 'balasan_pelapor';
                $userName = $isReporter
                    ? ($ticket->reporter_name ? $ticket->reporter_name.' (Pelapor)' : 'Pelapor')
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

        return response()->json([
            'success' => true,
            'message' => 'Detail tiket ditemukan.',
            'data' => $data,
        ], 200);
    }

    /**
     * POST /api/check/{ticketNumber}/reply
     * Pelapor membalas tanggapan tiket.
     */
    public function reply(Request $request, string $ticketNumber): JsonResponse
    {
        $ticketNumber = trim($ticketNumber);
        $ticket = Ticket::where('ticket_number', $ticketNumber)->first();

        if (! $ticket) {
            return response()->json([
                'success' => false,
                'message' => 'Nomor tiket tidak ditemukan.',
            ], 404);
        }

        if ($ticket->status === 'selesai') {
            return response()->json([
                'success' => false,
                'message' => 'Tiket telah selesai dan tidak dapat dibalas.',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'message' => ['required', 'string', 'min:5'],
            'attachments' => ['nullable', 'array', 'max:3'],
            'attachments.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:2048'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $response = TicketResponse::create([
            'ticket_id' => $ticket->id,
            'user_id' => null,
            'type' => 'balasan_pelapor',
            'message' => trim($validated['message']),
            'sent_at' => now(),
        ]);

        $attachmentsData = [];
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store("response_attachments/{$response->id}", 'public');

                $att = $response->attachments()->create([
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                ]);

                $attachmentsData[] = [
                    'id' => $att->id,
                    'original_name' => $att->original_name,
                    'mime_type' => $att->mime_type,
                    'size' => $att->size,
                    'url' => Storage::url($att->path),
                ];
            }
        }

        $ticket->update([
            'is_read' => false,
            'completed_at' => null,
        ]);

        Cache::forget('ticket_check:'.md5($ticket->ticket_number));
        Cache::forget("ticket:{$ticket->ticket_number}");
        Cache::forget('dashboard:admin:version');

        return response()->json([
            'success' => true,
            'message' => 'Balasan berhasil terkirim.',
            'data' => [
                'id' => $response->id,
                'type' => $response->type,
                'message' => $response->message,
                'sent_at' => $response->sent_at?->toIso8601String(),
                'attachments' => $attachmentsData,
            ],
        ], 201);
    }

    /**
     * POST /api/check/{ticketNumber}/complete
     * Pelapor menandai tiket selesai.
     */
    public function complete(string $ticketNumber): JsonResponse
    {
        $ticketNumber = trim($ticketNumber);
        $ticket = Ticket::where('ticket_number', $ticketNumber)->first();

        if (! $ticket) {
            return response()->json([
                'success' => false,
                'message' => 'Nomor tiket tidak ditemukan.',
            ], 404);
        }

        if ($ticket->status !== 'selesai') {
            $ticket->update([
                'status' => 'selesai',
                'completed_at' => now(),
            ]);

            Cache::forget('ticket_check:'.md5($ticket->ticket_number));
            Cache::forget("ticket:{$ticket->ticket_number}");
            Cache::forget('dashboard:admin:version');
        }

        return response()->json([
            'success' => true,
            'message' => 'Laporan telah ditandai selesai.',
        ], 200);
    }
}
