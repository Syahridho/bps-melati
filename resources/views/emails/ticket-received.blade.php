@php
    $meta = match ($ticket->classification) {
        'pengaduan' => [
            'title' => 'Laporan Anda Telah Diterima',
            'greeting' => 'Terima kasih telah membuat laporan melalui layanan Melati (Manajemen Lapor, Aspirasi, dan Transparansi Informasi). Laporan Anda telah berhasil kami terima dan akan segera ditindaklanjuti oleh petugas terkait BPS Provinsi Riau.',
        ],
        'aspirasi' => [
            'title' => 'Aspirasi Anda Telah Diterima',
            'greeting' => 'Terima kasih telah memberikan aspirasi Anda melalui layanan Melati (Manajemen Lapor, Aspirasi, dan Transparansi Informasi). Aspirasi Anda telah berhasil kami terima dan akan segera ditindaklanjuti oleh petugas terkait BPS Provinsi Riau.',
        ],
        'permintaan_informasi' => [
            'title' => 'Permintaan Informasi Anda Telah Diterima',
            'greeting' => 'Terima kasih telah menghubungi layanan kami, Melati (Manajemen Lapor, Aspirasi, dan Transparansi Informasi). Permintaan informasi Anda telah berhasil kami terima dan akan segera ditindaklanjuti oleh petugas terkait BPS Provinsi Riau.',
        ],
        default => [
            'title' => 'Laporan Anda Telah Diterima',
            'greeting' => 'Terima kasih telah membuat laporan melalui layanan Melati (Manajemen Lapor, Aspirasi, dan Transparansi Informasi). Laporan Anda telah berhasil kami terima dan akan segera ditindaklanjuti oleh petugas terkait BPS Provinsi Riau.',
        ],
    };
@endphp
<x-mail::message :hideHeader="true">
# {{ $meta['title'] }}

Yth. **{{ $ticket->reporter_name ?? 'Pelapor' }}**,

{{ $meta['greeting'] }}

### Ringkasan Laporan:
- **Nomor Tiket:** `{{ $ticket->ticket_number }}`
- **Klasifikasi:** {{ ucfirst(str_replace('_', ' ', $ticket->classification)) }}
@if($ticket->service_type)
- **Jenis Layanan:** {{ strtoupper($ticket->service_type) }}
@endif
@if($ticket->satuan_tugas)
- **Satuan Tugas:** {{ $ticket->satuan_tugas }}
@endif
- **Tanggal Dibuat:** {{ $ticket->created_at->locale('id')->translatedFormat('d F Y H:i') }} WIB

**Isi Laporan:**
> {{ Str::limit($ticket->content, 150) }}

Anda dapat memantau status perkembangan laporan Anda kapan saja melalui tautan di bawah ini dengan menggunakan nomor tiket Anda:

<x-mail::button :url="route('tickets.check', ['ticket_number' => $ticket->ticket_number])" color="primary">
Cek Status Tiket
</x-mail::button>

Pemberitahuan lebih lanjut atau tanggapan dari petugas akan dikirimkan setelah laporan diproses.

@if($ticket->attachments->count() > 0)
Lampiran pendukung yang Anda sertakan juga kami lampirkan pada email ini.
@endif

Terima kasih,<br>
**{{ config('app.name', 'Melati') }} - BPS Provinsi Riau**

<hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
<p style="font-size: 11px; color: #6b7280; text-align: center;">
Email ini dikirim otomatis oleh sistem, mohon tidak membalas email ini.
</p>
</x-mail::message>
