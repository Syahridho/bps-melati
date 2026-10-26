<?php

namespace App\Mail;

use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class TicketCreatedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Ticket $ticket
    ) {
        $this->onQueue('notifications');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[Laporan Diterima] Tiket #{$this->ticket->ticket_number}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.ticket-created',
            with: [
                'ticket' => $this->ticket,
                'reportTypeNoun' => $this->ticket->classificationNoun(),
                'reportTypeNounTitle' => $this->ticket->classificationNounTitle(),
            ],
        );
    }

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
