<?php

namespace App\Console\Commands;

use App\Events\TicketResponseEmailStatusUpdated;
use App\Mail\TicketResponseSubmitted;
use App\Models\TicketResponse;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class DiagnoseTicketEmail extends Command
{
    protected $signature = 'diagnose:ticket-email {response_id?} {--to=}';
    protected $description = 'Diagnosis setiap tahap pengiriman email tanggapan tiket dan mengukur durasinya';

    public function handle(): int
    {
        $responseId = $this->argument('response_id');
        $testEmail = $this->option('to');

        $this->info('Memulai diagnosis pengiriman email tanggapan tiket...');

        // 1. Ambil TicketResponse
        $start = microtime(true);
        try {
            $response = $responseId 
                ? TicketResponse::with(['ticket', 'attachments'])->find($responseId)
                : TicketResponse::with(['ticket', 'attachments'])->latest()->first();

            if (!$response || !$response->ticket) {
                $this->error('FAIL: TicketResponse atau Ticket tidak ditemukan.');
                return 1;
            }
            $duration = round((microtime(true) - $start) * 1000, 2);
            $maskedEmail = $this->maskEmail($response->ticket->reporter_email);
            $this->line("<info>PASS</info> [1. Query DB] Ditemukan Response ID: {$response->id}, Ticket ID: {$response->ticket_id}, Reporter Email: {$maskedEmail}, Attachments: {$response->attachments->count()} ({$duration} ms)");
        } catch (Throwable $e) {
            $this->error('FAIL [1. Query DB]: ' . $e->getMessage());
            return 1;
        }

        // 2. Render Template Mailable
        $start = microtime(true);
        try {
            $this->line("   Mulai render mailable...");
            $mailable = new TicketResponseSubmitted($response->ticket, $response);
            $rendered = $mailable->render();
            $duration = round((microtime(true) - $start) * 1000, 2);
            $this->line("<info>PASS</info> [2. Render Mailable] Template berhasil dirender (Panjang HTML: " . strlen($rendered) . " karakter) ({$duration} ms)");
        } catch (Throwable $e) {
            $this->error('FAIL [2. Render Mailable]: ' . $e->getMessage());
        }

        // 3. Cek Attachment Disk public
        $start = microtime(true);
        try {
            $validAttachments = 0;
            foreach ($response->attachments as $att) {
                $exists = Storage::disk('public')->exists($att->path);
                $size = $exists ? Storage::disk('public')->size($att->path) : 0;
                $this->line("   - Attachment ID {$att->id}: path '{$att->path}' -> Exists: " . ($exists ? 'YES' : 'NO') . " | Size: {$size} bytes | Mime: {$att->mime_type}");
                if ($exists) {
                    $validAttachments++;
                }
            }
            $duration = round((microtime(true) - $start) * 1000, 2);
            $this->line("<info>PASS</info> [3. Check Attachments] Divalidasi {$validAttachments} dari " . $response->attachments->count() . " berkas ({$duration} ms)");
        } catch (Throwable $e) {
            $this->error('FAIL [3. Check Attachments]: ' . $e->getMessage());
        }

        // 4. Kirim Test Email
        if ($testEmail) {
            $start = microtime(true);
            try {
                $this->line("   Mengirim test email ke {$testEmail}...");
                Mail::to($testEmail)->send(new TicketResponseSubmitted($response->ticket, $response));
                $duration = round((microtime(true) - $start) * 1000, 2);
                $this->line("<info>PASS</info> [4. Send Email] Email berhasil dikirim ke {$testEmail} ({$duration} ms)");
            } catch (Throwable $e) {
                $this->error('FAIL [4. Send Email]: ' . $e->getMessage());
            }
        } else {
            $this->line("<comment>SKIP</comment> [4. Send Email] Argumen --to= tidak diberikan. Lewati pengiriman email aktual.");
        }

        // 5. Cache Forget
        $start = microtime(true);
        try {
            $ticket = $response->ticket;
            Cache::forget('ticket_check:'.md5($ticket->ticket_number));
            Cache::forget("ticket:{$ticket->ticket_number}");
            $duration = round((microtime(true) - $start) * 1000, 2);
            $this->line("<info>PASS</info> [5. Cache Forget] Cache berhasil dibersihkan ({$duration} ms)");
        } catch (Throwable $e) {
            $this->error('FAIL [5. Cache Forget]: ' . $e->getMessage());
        }

        // 6. Broadcast Event dengan timeout simulasi
        $start = microtime(true);
        try {
            $this->line("   Mendispatch TicketResponseEmailStatusUpdated...");
            TicketResponseEmailStatusUpdated::dispatch($response, $ticket);
            $duration = round((microtime(true) - $start) * 1000, 2);
            $this->line("<info>PASS</info> [6. Broadcast Event] Event berhasil didispatch ({$duration} ms)");
        } catch (Throwable $e) {
            $this->error('FAIL [6. Broadcast Event]: ' . $e->getMessage());
        }

        $this->info('Diagnosis selesai.');
        return 0;
    }

    private function maskEmail(?string $email): string
    {
        if (blank($email) || !str_contains($email, '@')) {
            return '***';
        }
        [$local, $domain] = explode('@', $email, 2);
        return Str::limit($local, 3, '***') . '@' . $domain;
    }
}
