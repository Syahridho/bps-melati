<?php

namespace App\Mail;

use App\Models\Ticket;
use App\Models\TicketResponse;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class TicketResponseSubmitted extends Mailable
{
    use SerializesModels;

    public function __construct(
        public Ticket $ticket,
        public TicketResponse $response
    ) {}

    public function headers(): Headers
    {
        return new Headers(
            text: [
                'X-Ticket-Response-Id' => (string) $this->response->id,
            ],
        );
    }

    public function envelope(): Envelope
    {
        $responseLabel = $this->response->type === 'respon_awal'
            ? 'Respon Awal'
            : 'Respon Substantif';

        return new Envelope(
            subject: "[{$responseLabel}] Tanggapan Tiket #{$this->ticket->ticket_number}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.ticket-response',
            with: [
                'ticket' => $this->ticket,
                'response' => $this->response,
            ],
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        $mailAttachments = [];

        foreach ($this->response->attachments as $attachment) {
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
