{{-- Partial Kop Surat BPS Provinsi Riau untuk Cetak/PDF --}}
<div class="kop-surat">
    <div class="kop-logo">
        <img src="{{ asset('logo-bps.svg') }}" alt="Logo BPS">
    </div>
    <div class="kop-info">
        <div class="kop-instansi">Badan Pusat Statistik</div>
        <div class="kop-provinsi">Provinsi Riau</div>
        <div class="kop-alamat">{{ config('instansi.address') }}, Telepon: {{ config('instansi.phone') }}</div>
        <div class="kop-kontak">Laman: {{ config('instansi.website') }}, Pos-el: {{ config('instansi.email') }}</div>
    </div>
</div>
<div class="kop-garis"></div>
