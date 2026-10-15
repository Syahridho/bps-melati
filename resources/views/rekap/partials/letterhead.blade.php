{{-- Komponen gabungan Kop Surat + Judul Dokumen untuk tiap Halaman Cetak/PDF --}}
<div class="print-page-header">
    @include('rekap.partials.kop-surat')

    <div class="dokumen-judul">
        <h1>{{ $judulDokumen ?? 'REKAP LAPORAN PENGADUAN DAN ASPIRASI' }}</h1>
        <h2>{{ $subjudulDokumen ?? '' }}</h2>
    </div>
</div>
