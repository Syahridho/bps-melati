<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Rekap Pengaduan {{ $semesterLabel }}</title>
    <style>
        * { box-sizing: border-box; }

        body {
            margin: 0;
            padding: 18px;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            font-size: 10px;
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

        th, td { border: 1px solid #111827; padding: 2px 1px; }

        thead th {
            background: #e5e7eb;
            text-align: center;
            font-weight: 700;
            font-size: 8px;
            line-height: 1.15;
            word-break: break-word;
        }

        col.kolom-kanal { width: 26%; }
        col.kolom-angka { width: 2.6%; }
        col.kolom-jumlah { width: 5.5%; }

        tbody td.angka { text-align: center; }

        tbody td.kanal { text-align: left; font-size: 9px; }

        /* Kanal induk tidak dapat dipilih saat input data sehingga selalu kosong. */
        tbody tr.induk td { font-weight: 700; background: #d1d5db; color: #4b5563; }

        tbody tr.anak td.kanal { padding-left: 14px; font-weight: 400; }

        tfoot td {
            font-weight: 700;
            background: #e5e7eb;
            text-align: center;
            text-transform: uppercase;
            font-size: 9px;
        }

        tfoot td.kanal { text-align: left; }

        .kosong { text-align: center; padding: 14px; color: #6b7280; }

        .keterangan { margin-top: 6px; font-size: 8px; color: #4b5563; }

        /* Tanda tangan */
        .ttd { margin-top: 26px; display: flex; justify-content: flex-end; }

        .ttd-box { width: 240px; font-size: 10px; }

        .ttd-box .nama { margin-top: 52px; text-decoration: underline; }

        @page { size: A4 landscape; margin: 10mm; }

        @media print {
            body { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="kop">
        <img src="{{ asset('logo-bps.webp') }}" alt="Logo BPS">
        <div class="kop-text">
            <div class="instansi">Badan Pusat Statistik</div>
            <div class="provinsi">Provinsi Riau</div>
            <div class="alamat">Jl. Sultan Syarif Kasim No. 46, Pekanbaru, Riau</div>
        </div>
    </div>

    <div class="judul">
        <h1>Rekap Pengaduan BPS Provinsi Riau</h1>
        <h2>{{ $semesterLabel }}</h2>
    </div>

    <table>
        <colgroup>
            <col class="kolom-kanal">
            @foreach ($months as $month)
                @foreach (range(1, 4) as $ignored)
                    <col class="kolom-angka">
                @endforeach
            @endforeach
            <col class="kolom-jumlah">
        </colgroup>

        <thead>
            <tr>
                <th rowspan="2">Kanal</th>
                @foreach ($months as $month)
                    <th colspan="4">{{ $month['label'] }}</th>
                @endforeach
                <th rowspan="2">Jumlah</th>
            </tr>
            <tr>
                @foreach ($months as $month)
                    <th>PST</th>
                    <th>Lain</th>
                    <th>Asp</th>
                    <th>Inf</th>
                @endforeach
            </tr>
        </thead>

        <tbody>
            @forelse ($rows as $row)
                <tr class="induk">
                    <td class="kanal">{{ $row['channel'] }}</td>
                    @foreach ($months as $month)
                        @php $total = $row['perPeriod'][$month['key']] ?? 0; @endphp
                        <td class="angka" colspan="4">{{ $total }}</td>
                    @endforeach
                    <td class="angka">{{ $row['jumlah'] }}</td>
                </tr>

                @foreach ($row['children'] as $child)
                    <tr class="anak">
                        <td class="kanal">{{ $child['channel'] }}</td>
                        @foreach ($months as $month)
                            @php $total = $child['perPeriod'][$month['key']] ?? 0; @endphp
                            <td class="angka" colspan="4">{{ $total }}</td>
                        @endforeach
                        <td class="angka">{{ $child['jumlah'] }}</td>
                    </tr>
                @endforeach
            @empty
                <tr>
                    <td class="kosong" colspan="{{ count($months) * 4 + 2 }}">Belum ada data untuk periode ini.</td>
                </tr>
            @endforelse
        </tbody>

        <tfoot>
            <tr>
                <td class="kanal">Total</td>
                @foreach ($months as $month)
                    <td colspan="4">{{ $totals[$month['key']] ?? 0 }}</td>
                @endforeach
                <td>{{ $totals['jumlah'] }}</td>
            </tr>
        </tfoot>
    </table>

    <div class="keterangan">
        Keterangan: PST = Pengaduan Layanan PST, Lain = Pengaduan Layanan Lainnya, Asp = Aspirasi, Inf = Permintaan Informasi.
    </div>

    <div class="ttd">
        <div class="ttd-box">
            <div>{{ $penandaTangan['kota'] }}, {{ $penandaTangan['tanggal'] }}</div>
            <div style="margin-top: 5px; font-weight: 700;">{{ $penandaTangan['jabatan'] }}</div>
            <div class="nama">{{ $penandaTangan['nama'] ?: 'NAMA NYA' }}</div>
        </div>
    </div>
</body>
</html>
