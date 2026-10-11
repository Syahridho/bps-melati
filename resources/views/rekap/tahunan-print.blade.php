<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Rekap Pengaduan {{ $yearLabel }}</title>
    @include('rekap._print-style', ['orientasi' => 'landscape', 'marginHalaman' => 8])
</head>
<body>
    @php
        // Urutan HARUS sama dengan RekapReport::COLUMNS di backend.
        $classificationColumns = ['pengaduan_pst', 'pengaduan_lainnya', 'aspirasi', 'permintaan_informasi'];

        $ringkas = ($tampilan ?? 'detail') === 'ringkas';
        $tableRows = $ringkas ? ($ringkasRows ?? $rows) : $rows;
        $tableTotals = $ringkas ? ($ringkasTotals ?? $totals) : $totals;
        $columnsPerMonth = $ringkas ? 1 : 4;
        $totalCols = count($months) * $columnsPerMonth + 2;
    @endphp

    @include('rekap._print-kop')
    @include('rekap._print-judul', ['judul' => $yearLabel])

    <table class="{{ $ringkas ? 'ringkas' : 'detail' }}">
        <colgroup>
            <col class="kolom-kanal">
            @foreach ($months as $month)
                @foreach (range(1, $columnsPerMonth) as $ignored)
                    <col class="kolom-angka">
                @endforeach
            @endforeach
            <col class="kolom-jumlah">
        </colgroup>

        <thead>
            <tr>
                <th @if(! $ringkas) rowspan="2" @endif>Sumber Kanal</th>
                @foreach ($months as $month)
                    <th @if(! $ringkas) colspan="4" @endif>{{ $month['label'] }}</th>
                @endforeach
                <th @if(! $ringkas) rowspan="2" @endif>Jumlah</th>
            </tr>
            @unless($ringkas)
                <tr>
                    @foreach ($months as $month)
                        <th>PST</th>
                        <th>Lain</th>
                        <th>Asp</th>
                        <th>Inf</th>
                    @endforeach
                </tr>
            @endunless
        </thead>

        <tbody>
            @forelse ($tableRows as $row)
                @php $hasChildren = count($row['children'] ?? []) > 0; @endphp
                <tr class="induk {{ $hasChildren ? 'induk-cabang' : 'induk-tunggal' }}">
                    <td class="kanal">{{ $row['channel'] }}</td>
                    @if ($hasChildren)
                        {{-- Bercabang: data ada di baris anak, jadi kolom kanan dikosongkan --}}
                        @foreach ($months as $month)
                            @if ($ringkas)
                                <td class="angka"></td>
                            @else
                                @foreach ($classificationColumns as $column)
                                    <td class="angka"></td>
                                @endforeach
                            @endif
                        @endforeach
                        <td class="angka"></td>
                    @else
                        {{-- Tidak bercabang: tampilkan angka per bulan --}}
                        @foreach ($months as $month)
                            @if ($ringkas)
                                <td class="angka">{{ $row['perPeriod'][$month['key']] ?? 0 }}</td>
                            @else
                                @foreach ($classificationColumns as $column)
                                    <td class="angka">{{ $row['perPeriod'][$month['key']][$column] ?? 0 }}</td>
                                @endforeach
                            @endif
                        @endforeach
                        <td class="angka">{{ $row['jumlah'] }}</td>
                    @endif
                </tr>

                @foreach ($row['children'] as $child)
                    <tr class="anak">
                        <td class="kanal">{{ $child['channel'] }}</td>
                        @foreach ($months as $month)
                            @if ($ringkas)
                                <td class="angka">{{ $child['perPeriod'][$month['key']] ?? 0 }}</td>
                            @else
                                @foreach ($classificationColumns as $column)
                                    <td class="angka">{{ $child['perPeriod'][$month['key']][$column] ?? 0 }}</td>
                                @endforeach
                            @endif
                        @endforeach
                        <td class="angka">{{ $child['jumlah'] }}</td>
                    </tr>
                @endforeach
            @empty
                <tr>
                    <td class="kosong" colspan="{{ $totalCols }}">Belum ada data untuk periode ini.</td>
                </tr>
            @endforelse
        </tbody>

        <tfoot>
            <tr>
                <td class="kanal">Total</td>
                @foreach ($months as $month)
                    @if ($ringkas)
                        <td>{{ $tableTotals[$month['key']] ?? 0 }}</td>
                    @else
                        @foreach ($classificationColumns as $column)
                            <td>{{ $tableTotals[$month['key']][$column] ?? 0 }}</td>
                        @endforeach
                    @endif
                @endforeach
                <td>{{ $tableTotals['jumlah'] }}</td>
            </tr>
        </tfoot>
    </table>

    <div class="keterangan">
        @if ($ringkas)
            Keterangan: Angka menunjukkan jumlah PST + Lain + Asp + Inf.
        @else
            Keterangan: PST = Pengaduan Layanan PST, Lain = Pengaduan Layanan Lainnya, Asp = Aspirasi, Inf = Permintaan Informasi.
        @endif
    </div>

    @include('rekap._print-ttd')
</body>
</html>