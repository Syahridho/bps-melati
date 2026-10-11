{{--
    Blok tanda tangan rekap.

    Sumber nilai: $penandaTangan (App\Support\RekapReport::signatory(), dibaca dari
    tabel settings). Nilai di-cache rekap sengaja tidak dipakai supaya perubahan
    di halaman Pengaturan langsung tercermin di cetakan berikutnya.
--}}
<div class="ttd">
    <div class="ttd-box">
        <div>{{ $penandaTangan['kota'] }}, {{ $penandaTangan['tanggal'] }}</div>
        <div style="margin-top: 5px; font-weight: 700;">{{ $penandaTangan['jabatan'] }}</div>
        <div class="nama">{{ $penandaTangan['nama'] ?: 'NAMA NYA' }}</div>
    </div>
</div>