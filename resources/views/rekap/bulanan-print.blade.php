<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Rekap Pengaduan {{ $periodLabel }}</title>
    <style>
        * { box-sizing: border-box; }

        body {
            margin: 0;
            padding: 24px;
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            font-size: 12px;
            background: #ffffff;
        }

        .sheet { max-width: 1000px; margin: 0 auto; }

        /* Kop surat */
        .kop {
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 3px double #111827;
            padding-bottom: 12px;
            margin-bottom: 18px;
        }

        .kop img { width: 64px; height: 64px; object-fit: contain; }

        .kop-text { line-height: 1.25; }

        .kop-text .instansi {
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.02em;
            text-transform: uppercase;
        }

        .kop-text .provinsi {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }

        .kop-text .alamat {
            font-size: 10px;
            color: #4b5563;
            margin-top: 2px;
        }

        /* Judul */
        .judul { text-align: center; margin-bottom: 14px; }

        .judul h1 { font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 0.03em; }

        .judul h2 { font-size: 13px; margin: 4px 0 0; font-weight: 600; text-transform: uppercase; }

        /* Tabel */
        table { width: 100%; border-collapse: collapse; }

        th, td { border: 1px solid #111827; padding: 5px 6px; }

        thead th { background: #e5e7eb; text-align: center; font-weight: 700; font-size: 11px; }

        thead th .sub { display: block; font-weight: 400; font-size: 9px; }

        .kolom-kanal { width: 30%; text-align: left; }

        tbody td.angka { text-align: center; }

        tbody td.kanal { text-align: left; }

        /* Kanal induk tidak dapat dipilih saat input data sehingga selalu kosong. */
        tbody tr.induk td { font-weight: 700; background: #d1d5db; color: #4b5563; }

        tbody tr.anak td.kanal { padding-left: 20px; }

        tfoot td { font-weight: 700; background: #e5e7eb; text-align: center; text-transform: uppercase; }

        .kosong { text-align: center; padding: 18px; color: #6b7280; }

        /* Tanda tangan */
        .ttd { margin-top: 40px; display: flex; justify-content: flex-end; }

        .ttd-box { width: 260px; font-size: 12px; }

        .ttd-box .nama { margin-top: 68px; text-decoration: underline; }

        @page { size: A4 landscape; margin: 12mm; }

        @media print {
            body { padding: 0; font-size: 11px; }
            .sheet { max-width: none; }
        }
    </style>
</head>
<body>
    <div class="sheet">
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
            <h2>Bulan : {{ $periodLabel }}</h2>
        </div>

        <table>
            <thead>
                <tr>
                    <th class="kolom-kanal" rowspan="2">Kanal</th>
                    <th colspan="2">Pengaduan</th>
                    <th rowspan="2">Aspirasi</th>
                    <th rowspan="2">Permintaan Informasi</th>
                    <th rowspan="2">Jumlah</th>
                </tr>
                <tr>
                    <th>Layanan PST<span class="sub">(Pelayanan Statistik Terpadu)</span></th>
                    <th>Layanan Lainnya</th>
                </tr>
            </thead>

            <tbody>
                @forelse ($rows as $row)
                    <tr class="induk">
                        <td class="kanal">{{ $row['channel'] }}</td>
                        <td class="angka">{{ $row['pengaduan_pst'] }}</td>
                        <td class="angka">{{ $row['pengaduan_lainnya'] }}</td>
                        <td class="angka">{{ $row['aspirasi'] }}</td>
                        <td class="angka">{{ $row['permintaan_informasi'] }}</td>
                        <td class="angka">{{ $row['jumlah'] }}</td>
                    </tr>

                    @foreach ($row['children'] as $child)
                        <tr class="anak">
                            <td class="kanal">{{ $child['channel'] }}</td>
                            <td class="angka">{{ $child['pengaduan_pst'] }}</td>
                            <td class="angka">{{ $child['pengaduan_lainnya'] }}</td>
                            <td class="angka">{{ $child['aspirasi'] }}</td>
                            <td class="angka">{{ $child['permintaan_informasi'] }}</td>
                            <td class="angka">{{ $child['jumlah'] }}</td>
                        </tr>
                    @endforeach
                @empty
                    <tr>
                        <td class="kosong" colspan="6">Belum ada data untuk periode ini.</td>
                    </tr>
                @endforelse
            </tbody>

            <tfoot>
                <tr>
                    <td>Total</td>
                    <td>{{ $totals['pengaduan_pst'] }}</td>
                    <td>{{ $totals['pengaduan_lainnya'] }}</td>
                    <td>{{ $totals['aspirasi'] }}</td>
                    <td>{{ $totals['permintaan_informasi'] }}</td>
                    <td>{{ $totals['jumlah'] }}</td>
                </tr>
            </tfoot>
        </table>

        <div class="ttd">
            <div class="ttd-box">
                <div>{{ $penandaTangan['kota'] }}, {{ $penandaTangan['tanggal'] }}</div>
                <div style="margin-top: 6px; font-weight: 700;">{{ $penandaTangan['jabatan'] }}</div>
                <div class="nama">{{ $penandaTangan['nama'] ?: 'NAMA NYA' }}</div>
            </div>
        </div>
    </div>
</body>
</html>
