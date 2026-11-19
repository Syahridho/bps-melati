{{--
    CSS dasar untuk seluruh halaman cetak rekap.

    Variabel opsional:
      $orientasi      'portrait' (bulanan, 5 kolom) atau 'landscape' (semesteran/tahunan)
      $marginHalaman margin @page dalam mm

    Ukuran kop, judul, dan blok tanda tangan disamakan di semua rekap.
--}}
@php
    $orientasi = $orientasi ?? 'landscape';
    $marginHalaman = $marginHalaman ?? ($orientasi === 'portrait' ? 15 : 10);
@endphp
<style>
    * { box-sizing: border-box; }

    body {
        margin: 0;
        padding: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: #111827;
        font-size: 10pt;
        background: #ffffff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    /* Kop surat */
    .kop {
        display: flex;
        align-items: center;
        gap: 16px;
        border-bottom: 3px double #111827;
        padding-bottom: 12px;
        margin-bottom: 16px;
    }

    .kop img { width: 64px; height: 64px; object-fit: contain; }

    .kop-text { line-height: 1.3; }

    .kop-text .instansi {
        font-size: 15pt;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
    }

    .kop-text .provinsi {
        font-size: 17pt;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .kop-text .alamat { font-size: 10pt; color: #374151; margin-top: 3px; }

    /* Judul */
    .judul { text-align: center; margin-bottom: 14px; }

    .judul h1 { font-size: 14pt; margin: 0; text-transform: uppercase; letter-spacing: 0.03em; font-weight: 700; }

    .judul h2 { font-size: 12pt; margin: 4px 0 0; font-weight: 600; text-transform: uppercase; color: #374151; }

    /* Tabel */
    table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin-bottom: 12px;
    }

    th, td {
        border: 1px solid #111827;
        padding: 6px 8px;
        vertical-align: middle;
    }

    thead th {
        background: #fdfdfd;
        text-align: center;
        font-weight: 700;
        font-size: 10pt;
        line-height: 1.2;
        color: #111827;
    }

    col.kolom-kanal { width: 40%; }
    col.kolom-angka { width: 12%; }
    col.kolom-jumlah { width: 12%; }

    /* Mode ringkas untuk matriks besar */
    table.ringkas col.kolom-kanal { width: 26%; }
    table.ringkas col.kolom-angka { width: 8%; }
    table.ringkas col.kolom-jumlah { width: 10%; }
    table.ringkas thead th { font-size: 9pt; }
    table.ringkas tbody td.angka,
    table.ringkas tbody td.kanal,
    table.ringkas tfoot td { font-size: 10pt; }

    tbody td.angka {
        text-align: center;
        font-size: 10.5pt;
        font-weight: 500;
        color: #111827;
    }

    tbody td.kanal {
        text-align: left;
        font-size: 10.5pt;
        color: #111827;
    }

    /* Kanal induk */
    tbody tr.induk td.kanal {
        font-weight: 700;
        background: #f3f4f6;
        color: #1f2937;
    }

    tbody tr.induk-cabang td.angka {
        background: #f3f4f6;
    }

    tbody tr.induk-tunggal td.angka {
        background: #ffffff;
        color: #111827;
    }

    tbody tr.anak td.kanal {
        padding-left: 20px;
        font-weight: 400;
        color: #374151;
    }

    tfoot td {
        font-weight: 700;
        background: #e5e7eb;
        text-align: center;
        text-transform: uppercase;
        font-size: 11pt;
        color: #111827;
        padding: 7px 8px;
    }

    tfoot td.kanal { text-align: left; }

    .kosong { text-align: center; padding: 20px; color: #4b5563; font-style: italic; font-size: 10pt; }

    .keterangan {
        margin-top: 10px;
        font-size: 9.5pt;
        color: #374151;
        line-height: 1.4;
    }

    /* Tanda tangan */
    .ttd {
        margin-top: 32px;
        display: flex;
        justify-content: flex-end;
        page-break-inside: avoid;
        break-inside: avoid;
    }

    .ttd-box {
        width: 260px;
        font-size: 11pt;
        color: #111827;
        line-height: 1.4;
    }

    .ttd-box .nama {
        margin-top: 64px;
        font-weight: 700;
        text-decoration: underline;
    }

    tr {
        page-break-inside: avoid;
        break-inside: avoid;
    }

    thead {
        display: table-header-group;
    }

    @page { size: A4 {{ $orientasi }}; margin: {{ $marginHalaman }}mm; }

    @media print {
        body { padding: 0; }
    }
</style>
