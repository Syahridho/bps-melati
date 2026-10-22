<x-mail::message>
# Laporan Anda Berhasil Dikirim (Tiket #{{ $ticket->ticket_number }})

Yth. **{{ $ticket->reporter_name ?? 'Pelapor' }}**,

Terima kasih telah menyampaikan laporan melalui sistem **Melati (Layanan Aspirasi & Pengaduan Online)**. Laporan Anda telah kami terima dan akan segera diproses oleh petugas terkait.

<x-mail::panel>
**Ringkasan Laporan:**
- **Nomor Tiket:** `{{ $ticket->ticket_number }}`
- **Klasifikasi:** {{ ucfirst(str_replace('_', ' ', $ticket->classification)) }}
@if($ticket->service_type)
- **Jenis Layanan:** {{ strtoupper($ticket->service_type) }}
@endif
@if($ticket->satuan_tugas)
- **Satuan Tugas:** {{ $ticket->satuan_tugas }}
@endif
- **Judul:** {{ $ticket->title }}
- **Tanggal Dibuat:** {{ $ticket->created_at->locale('id')->translatedFormat('d F Y H:i') }} WIB
</x-mail::panel>

**Isi Laporan:**
> {{ $ticket->content }}

@if($ticket->attachments->count() > 0)
*Catatan: Terdapat {{ $ticket->attachments->count() }} file lampiran yang disertakan pada laporan ini.*
@endif

Anda dapat memantau status perkembangan laporan ini kapan saja melalui tombol di bawah:

<x-mail::button :url="url('/check') . '?' . http_build_query(['ticket_number' => $ticket->ticket_number])" color="primary">
Cek Status Tiket
</x-mail::button>

Terima kasih,<br>
**{{ config('app.name', 'Melati') }} - BPS Provinsi Riau**
</x-mail::message>
