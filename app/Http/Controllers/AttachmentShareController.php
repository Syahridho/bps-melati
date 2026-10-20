<?php

namespace App\Http\Controllers;

use App\Models\ResponseAttachment;
use App\Models\TicketAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class AttachmentShareController extends Controller
{
    /**
     * Sajikan lampiran via share token untuk QR code export rekap (mendukung preview/scan).
     */
    public function __invoke(Request $request, string $token): Response
    {
        $attachment = TicketAttachment::where('share_token', $token)->first()
            ?? ResponseAttachment::where('share_token', $token)->first();

        if (! $attachment) {
            abort(404, 'Lampiran tidak ditemukan.');
        }

        // Cek pengaturan publik vs auth
        $isPublic = (bool) \App\Models\Setting::get('lampiran_qr_publik', false);
        if (! $isPublic && ! auth()->check()) {
            return redirect()->guest(route('login'));
        }

        $path = $attachment->path;
        if (blank($path) || str_contains($path, '..')) {
            abort(404, 'Lampiran tidak ditemukan.');
        }

        $disk = null;
        if (Storage::disk('public')->exists($path)) {
            $disk = 'public';
        } elseif (Storage::disk('local')->exists($path)) {
            $disk = 'local';
        }

        if ($disk === null) {
            abort(404, 'File lampiran tidak ditemukan di penyimpanan.');
        }

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
            'X-Robots-Tag' => 'noindex',
        ];

        return Storage::disk($disk)->response(
            $path,
            $sanitizedFilename,
            $headers,
            $disposition
        );
    }
}
