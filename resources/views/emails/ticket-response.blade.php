<x-mail::message>
# Tanggapan Laporan Tiket #{{ $ticket->ticket_number }}

Yth. **{{ $ticket->reporter_name ?? 'Pelapor' }}**,

Terima kasih telah menyampaikan laporan melalui sistem **Melati (Layanan Aspirasi & Pengaduan Online)**.

Berikut adalah **{{ $response->type === 'respon_awal' ? 'Respon Awal' : 'Respon Substantif' }}** dari tim kami:

<x-mail::panel>
**Pesan Tanggapan:**

{!! nl2br(e($response->message)) !!}
</x-mail::panel>

### Ringkasan Laporan Anda:
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
> {{ $ticket->content }}

@if($response->attachments->count() > 0)
*Catatan: Terlampir {{ $response->attachments->count() }} file dokumen pendukung pada email ini.*
@endif

Jika Anda memiliki pertanyaan lebih lanjut, silakan hubungi kami melalui layanan informasi resmi.

Terima kasih,<br>
**{{ config('app.name', 'Melati') }} - BPS Provinsi Riau**
</x-mail::message>
