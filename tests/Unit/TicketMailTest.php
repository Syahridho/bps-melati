<?php

namespace Tests\Unit;

use App\Mail\TicketCreatedMail;
use App\Mail\TicketResponseSubmitted;
use App\Models\Ticket;
use App\Models\TicketResponse;
use Illuminate\Mail\Markdown;
use Tests\TestCase;

class TicketMailTest extends TestCase
{
    public function test_classification_noun_mapping(): void
    {
        $this->assertSame('pengaduan', Ticket::classificationNounFor('pengaduan'));
        $this->assertSame('aspirasi', Ticket::classificationNounFor('aspirasi'));
        $this->assertSame('permintaan informasi', Ticket::classificationNounFor('permintaan_informasi'));
        $this->assertSame('laporan', Ticket::classificationNounFor(null));
        $this->assertSame('laporan', Ticket::classificationNounFor('unknown_type'));

        $ticket = new Ticket(['classification' => 'permintaan_informasi']);
        $this->assertSame('permintaan informasi', $ticket->classificationNoun());
        $this->assertSame('Permintaan informasi', $ticket->classificationNounTitle());
    }

    public function test_ticket_created_mail_opening_sentence_is_dynamic(): void
    {
        $cases = [
            'pengaduan' => [
                'expected' => 'Terima kasih telah menyampaikan pengaduan melalui sistem Melati (Manajemen Lapor, Aspirasi, dan Transparansi Informasi). Pengaduan Anda telah kami terima dan akan segera diproses oleh petugas terkait.',
            ],
            'aspirasi' => [
                'expected' => 'Terima kasih telah menyampaikan aspirasi melalui sistem Melati (Manajemen Lapor, Aspirasi, dan Transparansi Informasi). Aspirasi Anda telah kami terima dan akan segera diproses oleh petugas terkait.',
            ],
            'permintaan_informasi' => [
                'expected' => 'Terima kasih telah menyampaikan permintaan informasi melalui sistem Melati (Manajemen Lapor, Aspirasi, dan Transparansi Informasi). Permintaan informasi Anda telah kami terima dan akan segera diproses oleh petugas terkait.',
            ],
            null => [
                'expected' => 'Terima kasih telah menyampaikan laporan melalui sistem Melati (Manajemen Lapor, Aspirasi, dan Transparansi Informasi). Laporan Anda telah kami terima dan akan segera diproses oleh petugas terkait.',
            ],
        ];

        foreach ($cases as $classification => $data) {
            $ticket = new Ticket([
                'ticket_number' => 'L-1400/102026/AA01',
                'classification' => $classification,
                'title' => 'Judul Uji Coba',
                'reporter_name' => 'Budi Santoso',
                'content' => 'Isi laporan uji coba.',
            ]);
            $ticket->created_at = now();
            $ticket->setRelation('attachments', collect());

            $mail = new TicketCreatedMail($ticket);
            $html = $mail->render();

            $plainTextHtml = html_entity_decode(strip_tags($html));
            $this->assertStringContainsString($data['expected'], $plainTextHtml);

            // Plain text check
            $text = (new Markdown(view(), config('mail.markdown')))->renderText('emails.ticket-created', [
                'ticket' => $ticket,
                'reportTypeNoun' => $ticket->classificationNoun(),
                'reportTypeNounTitle' => $ticket->classificationNounTitle(),
            ]);
            $this->assertStringContainsString('Terima kasih telah menyampaikan ' . $ticket->classificationNoun(), $text);
            $this->assertStringContainsString($ticket->classificationNounTitle() . ' Anda telah kami terima', $text);
        }
    }

    public function test_header_melati_is_removed_and_footer_has_official_name_and_year(): void
    {
        $ticket = new Ticket([
            'ticket_number' => 'L-1400/102026/AA01',
            'classification' => 'pengaduan',
            'title' => 'Judul Uji Coba',
            'reporter_name' => 'Budi Santoso',
            'content' => 'Isi laporan uji coba.',
        ]);
        $ticket->created_at = now();
        $ticket->setRelation('attachments', collect());

        $mail = new TicketCreatedMail($ticket);
        $html = $mail->render();

        // 1. Header paling atas di atas kartu putih tidak boleh ada
        $this->assertStringNotContainsString('class="header"', $html);

        // 2. Footer memuat kepanjangan resmi dan tahun dinamis
        $year = date('Y');
        $this->assertStringContainsString('Melati: Manajemen Lapor, Aspirasi, dan Transparansi Informasi', $html);
        $this->assertStringContainsString("© {$year} Melati. All rights reserved.", $html);

        // 3. Penutup tetap Terima kasih, Melati - BPS Provinsi Riau
        $this->assertStringContainsString('Terima kasih,', $html);
        $this->assertStringContainsString('Melati - BPS Provinsi Riau', $html);

        // 4. Plain text check
        $text = (new Markdown(view(), config('mail.markdown')))->renderText('emails.ticket-created', [
            'ticket' => $ticket,
            'reportTypeNoun' => $ticket->classificationNoun(),
            'reportTypeNounTitle' => $ticket->classificationNounTitle(),
        ]);
        $this->assertStringNotContainsString('Melati: http', $text);
        $this->assertStringContainsString('Melati: Manajemen Lapor, Aspirasi, dan Transparansi Informasi', $text);
        $this->assertStringContainsString("© {$year} Melati. All rights reserved.", $text);
    }

    public function test_ticket_response_email_contains_updated_acronym(): void
    {
        $ticket = new Ticket([
            'ticket_number' => 'L-1400/102026/AA01',
            'classification' => 'pengaduan',
            'title' => 'Judul Laporan',
            'reporter_name' => 'Budi Santoso',
            'content' => 'Isi tiket.',
        ]);
        $ticket->created_at = now();
        $ticket->setRelation('attachments', collect());

        $response = new TicketResponse([
            'type' => 'respon_awal',
            'message' => 'Laporan telah kami terima dan ditindaklanjuti.',
        ]);
        $response->setRelation('attachments', collect());

        $mail = new TicketResponseSubmitted($ticket, $response);
        $html = $mail->render();

        $this->assertStringContainsString('Melati (Manajemen Lapor, Aspirasi, dan Transparansi Informasi)', $html);
        $this->assertStringNotContainsString('Layanan Aspirasi & Pengaduan Online', $html);
    }
}
