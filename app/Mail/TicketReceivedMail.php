<?php

namespace App\Mail;

use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class TicketReceivedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public Ticket $ticket
    ) {
        $this->onQueue('notifications');
        $this->ticket->loadMissing('attachments');
    }

    public function headers(): Headers
    {
        return new Headers(
            text: [
                'X-Ticket-Number' => (string) $this->ticket->ticket_number,
            ],
        );
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[Melati] Laporan Anda telah diterima - {$this->ticket->ticket_number}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.ticket-received',
            with: [
                'ticket' => $this->ticket,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        $mailAttachments = [];

        foreach ($this->ticket->attachments as $attachment) {
            if (Storage::disk('public')->exists($attachment->path)) {
                $path = Storage::disk('public')->path($attachment->path);
                $mailAttachments[] = Attachment::fromPath($path)
                    ->as($attachment->original_name)
                    ->withMime($attachment->mime_type);
            }
        }

        return $mailAttachments;
    }
}
