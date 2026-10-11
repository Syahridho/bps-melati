<?php

namespace App\Http\Controllers;

use App\Models\ResponseAttachment;
use App\Models\TicketAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class CheckAttachmentDownloadController extends Controller
{
    /**
     * Unduh lampiran tiket atau balasan menggunakan URL bertanda tangan (signed URL).
     */
    public function __invoke(Request $request, string $type, int $id): Response
    {
        // 1. Ambil attachment sesuai jenis
        $attachment = match ($type) {
            'ticket' => TicketAttachment::with('ticket')->find($id),
            'response' => ResponseAttachment::with('response.ticket')->find($id),
            default => null,
        };

        // 2. Validasi relasi ke tiket; balas 404 jika tidak ditemukan atau relasi tidak valid
        if (! $attachment) {
            abort(404, 'Lampiran tidak ditemukan.');
        }

        $ticket = match ($type) {
            'ticket' => $attachment->ticket,
            'response' => $attachment->response?->ticket,
        };

        if (! $ticket) {
            abort(404, 'Lampiran tidak ditemukan.');
        }

        // Validasi tiket yang meminta sesuai dengan tiket pemilik lampiran
        $expectedTicketId = $request->query('ticket');
        if ($expectedTicketId !== null && (int) $ticket->id !== (int) $expectedTicketId) {
            abort(404, 'Lampiran tidak ditemukan.');
        }

        // 3. Cegah path traversal
        $path = $attachment->path;
        if (blank($path) || str_contains($path, '..')) {
            abort(404, 'Lampiran tidak ditemukan.');
        }

        // 4. Periksa ketersediaan file pada disk (utamakan disk 'public', fallback 'local')
        $disk = null;
        if (Storage::disk('public')->exists($path)) {
            $disk = 'public';
        } elseif (Storage::disk('local')->exists($path)) {
            $disk = 'local';
        }

        if ($disk === null) {
            abort(404, 'Lampiran tidak ditemukan.');
        }

        // 5. Tentukan inline vs attachment disposition
        $mime = $attachment->mime_type ?: Storage::disk($disk)->mimeType($path);
        $isInlineable = in_array(strtolower((string) $mime), [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/gif',
        ], true);

        $disposition = $isInlineable ? 'inline' : 'attachment';

        $filename = basename($attachment->original_name ?: 'lampiran');
        $sanitizedFilename = preg_replace('/[^\pL\pN\s\._-]/u', '', $filename) ?: 'lampiran';

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ];

        return Storage::disk($disk)->response(
            $path,
            $sanitizedFilename,
            $headers,
            $disposition
        );
    }
}
