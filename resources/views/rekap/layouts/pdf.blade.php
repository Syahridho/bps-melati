{{-- Layout Bersama PDF Rekap BPS --}}
@php
    $orientasi = $orientasi ?? 'landscape';
    $marginHalaman = $marginHalaman ?? ($orientasi === 'portrait' ? '15mm' : '10mm');
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>{{ $title ?? 'Rekap Laporan' }}</title>
    <style>
        @page {
            size: A4 {{ $orientasi }};
            margin: 15mm {{ $marginHalaman }} 12mm {{ $marginHalaman }};
            @bottom-center {
                content: "Halaman " counter(page) " dari " counter(pages);
                font-family: Arial, Helvetica, "Liberation Sans", sans-serif;
                font-size: 8pt;
                color: #333333;
            }
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, "Liberation Sans", sans-serif;
            color: #000000;
            font-size: 9.5pt;
            line-height: 1.2;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .page-section {
            page-break-after: always;
            break-after: page;
        }
        .page-section:last-of-type {
            page-break-after: avoid;
            break-after: avoid;
        }

        /* Kop Surat */
        .kop-surat {
            width: 100%;
            margin-bottom: 3mm;
            padding-bottom: 0;
            position: relative;
        }

        .kop-logo {
            position: absolute;
            left: 0;
            top: 0;
            width: 20mm;
        }

        .kop-logo img {
            width: 18mm;
            height: auto;
            object-fit: contain;
        }

        .kop-info {
            margin-left: 22mm;
            text-align: left;
        }

        .kop-instansi {
            font-family: Arial, Helvetica, "Liberation Sans", sans-serif;
            font-size: 15pt;
            font-weight: bold;
            font-style: italic;
            text-transform: uppercase;
            color: #000000;
            line-height: 1.1;
            margin-bottom: 1px;
        }

        .kop-provinsi {
            font-family: Arial, Helvetica, "Liberation Sans", sans-serif;
            font-size: 13pt;
            font-weight: bold;
            font-style: italic;
            text-transform: uppercase;
            color: #000000;
            line-height: 1.1;
            margin-bottom: 3px;
        }

        .kop-alamat {
            font-size: 7.5pt;
            color: #000000;
            line-height: 1.2;
            margin-bottom: 1px;
        }

        .kop-kontak {
            font-size: 7.5pt;
            color: #000000;
            line-height: 1.2;
        }

        .kop-garis {
            width: 100%;
            height: 1.5pt;
            background-color: #000000;
            margin-top: 3mm;
            margin-bottom: 4mm;
        }

        /* Judul Dokumen */
        .dokumen-judul {
            text-align: center;
            margin-bottom: 4mm;
        }

        .dokumen-judul h1 {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0 0 1.5mm 0;
        }

        .dokumen-judul h2 {
            font-size: 10pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0;
            color: #222222;
        }

        /* Tabel Profesional */
        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 4mm;
            page-break-inside: auto;
        }

        tr {
            page-break-inside: avoid;
            page-break-after: auto;
            break-inside: avoid;
        }

        thead {
            display: table-header-group;
        }

        tfoot {
            display: table-row-group;
        }

        th, td {
            border: 0.75pt solid #111111;
            padding: 2.5px 2px;
            vertical-align: middle;
            font-size: 7.5pt;
            background: #ffffff !important;
            color: #000000;
            white-space: nowrap;
        }

        th {
            font-weight: bold;
            text-align: center;
            background: #ffffff !important;
            white-space: nowrap;
        }

        td.angka, th.angka {
            text-align: center;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }

        td.tengah, th.tengah {
            text-align: center;
            white-space: nowrap;
        }

        td.kanal {
            text-align: left;
            white-space: nowrap;
        }

        tfoot td {
            font-weight: bold;
            background: #ffffff !important;
        }

        /* Keterangan & Tanda Tangan */
        .keterangan {
            font-size: 7.5pt;
            font-style: italic;
            margin-top: 2mm;
            margin-bottom: 3mm;
        }

        .ttd-container {
            width: 100%;
            page-break-inside: avoid;
            break-inside: avoid;
            margin-top: 12mm;
        }

        .ttd-box {
            float: right;
            width: 65mm;
            text-align: center;
            font-size: 9pt;
        }

        .ttd-space {
            height: 24mm;
        }

        .ttd-nama {
            font-weight: bold;
            text-decoration: underline;
        }

        .ttd-nip {
            margin-top: 1px;
        }

        .clearfix::after {
            content: "";
            clear: both;
            display: table;
        }

        {{ $customCss ?? '' }}
    </style>
</head>
<body>
    {{ $slot }}
</body>
</html>
