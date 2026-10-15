<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Rekap Pengaduan {{ $periodLabel }}</title>
    {{-- Rekap bulanan memakai portrait dengan margin 15mm --}}
    @include('rekap._print-style', ['orientasi' => 'portrait', 'marginHalaman' => 15])
</head>
<body>
    @include('rekap._print-kop')

    @include('rekap._print-judul', ['judul' => 'Bulan : '.$periodLabel])

    <style>
        col.kolom-kanal { width: 40%; }
        col.kolom-pst { width: 12%; }
        col.kolom-lainnya { width: 12%; }
        col.kolom-aspirasi { width: 12%; }
        col.kolom-info { width: 12%; }
        col.kolom-jumlah { width: 12%; }
    </style>

    <table>
        <colgroup>
            <col class="kolom-kanal">
            <col class="kolom-pst">
            <col class="kolom-lainnya">
            <col class="kolom-aspirasi">
            <col class="kolom-info">
            <col class="kolom-jumlah">
        </colgroup>

        <thead>
            <tr>
                <th rowspan="2">Sumber Kanal</th>
                <th colspan="2">Pengaduan</th>
                <th rowspan="2">Aspirasi</th>
                <th rowspan="2">Permintaan<br>Informasi</th>
                <th rowspan="2">Jumlah</th>
            </tr>
            <tr>
                <th>Layanan PST</th>
                <th>Layanan Lainnya</th>
            </tr>
        </thead>

        <tbody>
            @forelse ($rows as $row)
                @php
                    $hasChildren = isset($row['children']) && count($row['children']) > 0;
                @endphp

                <tr class="induk {{ $hasChildren ? 'induk-cabang' : 'induk-tunggal' }}">
                    <td class="kanal">{{ $row['channel'] }}</td>

                    @if ($hasChildren)
                        <td class="angka" colspan="5"></td>
                    @else
                        <td class="angka">{{ $row['pengaduan_pst'] }}</td>
                        <td class="angka">{{ $row['pengaduan_lainnya'] }}</td>
                        <td class="angka">{{ $row['aspirasi'] }}</td>
                        <td class="angka">{{ $row['permintaan_informasi'] }}</td>
                        <td class="angka">{{ $row['jumlah'] }}</td>
                    @endif
                </tr>

                @foreach ($row['children'] ?? [] as $child)
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
                <td class="kanal">Total</td>
                <td>{{ $totals['pengaduan_pst'] }}</td>
                <td>{{ $totals['pengaduan_lainnya'] }}</td>
                <td>{{ $totals['aspirasi'] }}</td>
                <td>{{ $totals['permintaan_informasi'] }}</td>
                <td>{{ $totals['jumlah'] }}</td>
            </tr>
        </tfoot>
    </table>

    <div class="keterangan">
        Keterangan: PST = Pengaduan Layanan PST, Lainnya = Pengaduan Layanan Lainnya, Aspirasi = Aspirasi, Permintaan Informasi = Permintaan Informasi.
    </div>

    @include('rekap._print-ttd')
</body>
</html>
