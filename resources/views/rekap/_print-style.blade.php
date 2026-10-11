{{--
    CSS dasar untuk seluruh halaman cetak rekap.

    Variabel opsional:
      $orientasi      'portrait' (bulanan, 5 kolom) atau 'landscape' (semesteran/tahunan)
      $marginHalaman margin @page dalam mm

    Ukuran kop, judul, dan blok tanda tangan sengaja disamakan di semua rekap.
    Yang tetap berbeda hanya orientasi dan gaya tabel, yang memang berbeda bentuk.
--}}
@php
    $orientasi = $orientasi ?? 'landscape';
    $marginHalaman = $marginHalaman ?? ($orientasi === 'portrait' ? 12 : 8);
@endphp
<style>
    * { box-sizing: border-box; }

    body {
        margin: 0;
        padding: 18px;
        font-family: Arial, Helvetica, sans-serif;
        color: #111827;
        font-size: 9px;
        background: #ffffff;
    }

    /* Kop surat */
    .kop {
        display: flex;
        align-items: center;
        gap: 14px;
        border-bottom: 3px double #111827;
        padding-bottom: 10px;
        margin-bottom: 14px;
    }

    .kop img { width: 56px; height: 56px; object-fit: contain; }

    .kop-text { line-height: 1.25; }

    .kop-text .instansi {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
    }

    .kop-text .provinsi {
        font-size: 17px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .kop-text .alamat { font-size: 9px; color: #4b5563; margin-top: 2px; }

    /* Judul */
    .judul { text-align: center; margin-bottom: 10px; }

    .judul h1 { font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.03em; }

    .judul h2 { font-size: 11px; margin: 3px 0 0; font-weight: 600; text-transform: uppercase; }

    /* Tabel */
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }

    th, td { border: 1px solid #111827; padding: 1px 0; }

    thead th {
        background: #e5e7eb;
        text-align: center;
        font-weight: 700;
        font-size: 6px;
        line-height: 1.1;
        word-break: break-word;
    }

    col.kolom-kanal { width: 14%; }
    col.kolom-angka { width: 1.7%; }
    col.kolom-jumlah { width: 3.4%; }

    /* Mode ringkas: satu kolom angka per bulan, kolom boleh lebih lebar dan
       font diperbesar supaya tabel tetap terbaca dan tidak terpotong. */
    table.ringkas col.kolom-kanal { width: 26%; }
    table.ringkas col.kolom-angka { width: 10%; }
    table.ringkas col.kolom-jumlah { width: 14%; }
    table.ringkas thead th { font-size: 9px; }
    table.ringkas tbody td.angka,
    table.ringkas tbody td.kanal,
    table.ringkas tfoot td { font-size: 9px; }

    tbody td.angka { text-align: center; font-size: 7px; }

    tbody td.kanal { text-align: left; font-size: 7px; }

    /* Kanal induk (nama kanal di kolom kiri) selalu tebal dan abu-abu */
    tbody tr.induk td.kanal { font-weight: 700; background: #d1d5db; color: #4b5563; }

    /* Kanal induk yang BERCABANG: kolom data dikosongkan dan diberi abu-abu,
       karena datanya ditampilkan di baris anak di bawahnya. */
    tbody tr.induk-cabang td.angka { background: #d1d5db; }

    /* Kanal induk yang TIDAK bercabang: data ditampilkan apa adanya. */
    tbody tr.induk-tunggal td.angka { background: #ffffff; color: #111827; }

    tbody tr.anak td.kanal { padding-left: 10px; font-weight: 400; }

    tfoot td {
        font-weight: 700;
        background: #e5e7eb;
        text-align: center;
        text-transform: uppercase;
        font-size: 7px;
    }

    tfoot td.kanal { text-align: left; }

    .kosong { text-align: center; padding: 14px; color: #6b7280; }

    .keterangan { margin-top: 6px; font-size: 8px; color: #4b5563; }

    /* Tanda tangan */
    .ttd { margin-top: 26px; display: flex; justify-content: flex-end; }

    .ttd-box { width: 240px; font-size: 10px; }

    .ttd-box .nama { margin-top: 52px; text-decoration: underline; }

    @page { size: A4 {{ $orientasi }}; margin: {{ $marginHalaman }}mm; }

    @media print {
        body { padding: 0; }
    }
</style>