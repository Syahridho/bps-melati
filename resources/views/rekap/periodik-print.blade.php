@component('rekap.layouts.pdf', [
    'orientasi' => 'landscape',
    'marginHalaman' => '8mm',
    'title' => 'Rekap Pengaduan ' . $periodeLabel,
])
    @php
        $classificationColumns = ['pengaduan_pst', 'pengaduan_lainnya', 'aspirasi', 'permintaan_informasi'];
        $ringkas = ($tampilan ?? 'detail') === 'ringkas';
        $tableRows = $ringkas ? ($ringkasRows ?? $rows) : $rows;
        $tableTotals = $ringkas ? ($ringkasTotals ?? $totals) : $totals;

        // Jika lebih dari 6 bulan di mode detail atau lebih dari 12 di mode ringkas, pecah per chunk
        $chunkSize = $ringkas ? 12 : 6;
        $monthChunks = array_chunk($months, $chunkSize);

        $columnsPerMonth = $ringkas ? 1 : 4;
        $judulDokumen = 'REKAP LAPORAN PERIODIK BPS PROVINSI RIAU';
        $subjudulDokumen = $periodeLabel;
    @endphp

    <style>
        .page-section {
            page-break-after: always;
            break-after: page;
        }
        .page-section:last-of-type {
            page-break-after: avoid;
            break-after: avoid;
        }
        col.kolom-kanal { width: 18%; }
        col.kolom-jumlah { width: 7%; }
        .sub-heading {
            font-size: 9.5pt;
            font-weight: bold;
            margin-bottom: 2mm;
            text-transform: uppercase;
        }
        table.detail th, table.detail td {
            font-size: 7pt;
            padding: 2px 1.5px;
        }
        table.detail th.sub-col {
            font-size: 6.5pt;
            letter-spacing: -0.2px;
            padding: 2px 0.5px;
        }
    </style>

    @foreach ($monthChunks as $chunkIndex => $chunkMonths)
        @php
            $isLastChunk = ($chunkIndex === count($monthChunks) - 1);
            $chunkColCount = count($chunkMonths);
            $colWidth = (75 / ($chunkColCount * $columnsPerMonth)) . '%';
            $firstMonth = $chunkMonths[0]['label'];
            $lastMonth = end($chunkMonths)['label'];
            $chunkTitle = count($chunkMonths) === 1 ? $firstMonth : "Periode: {$firstMonth} - {$lastMonth}";
        @endphp

        <div class="page-section">
            @include('rekap.partials.letterhead', ['judulDokumen' => $judulDokumen, 'subjudulDokumen' => $subjudulDokumen])
            @if(count($monthChunks) > 1)
                <div class="sub-heading">Bagian {{ $chunkIndex + 1 }}: {{ $chunkTitle }}</div>
            @endif

            <table class="{{ $ringkas ? 'ringkas' : 'detail' }}">
                <colgroup>
                    <col class="kolom-kanal">
                    @foreach ($chunkMonths as $month)
                        @foreach (range(1, $columnsPerMonth) as $ignored)
                            <col style="width: {{ $colWidth }};">
                        @endforeach
                    @endforeach
                    <col class="kolom-jumlah">
                </colgroup>
                <thead>
                    <tr>
                        <th @if(! $ringkas) rowspan="2" @endif>Sumber Kanal</th>
                        @foreach ($chunkMonths as $month)
                            <th @if(! $ringkas) colspan="4" @endif>{{ $month['label'] }}</th>
                        @endforeach
                        <th @if(! $ringkas) rowspan="2" @endif>Jumlah</th>
                    </tr>
                    @unless($ringkas)
                        <tr>
                            @foreach ($chunkMonths as $month)
                                <th class="sub-col">PST</th>
                                <th class="sub-col">NonPST</th>
                                <th class="sub-col">Asp</th>
                                <th class="sub-col">Inf</th>
                            @endforeach
                        </tr>
                    @endunless
                </thead>
                <tbody>
                    @forelse ($tableRows as $row)
                        @php $hasChildren = count($row['children'] ?? []) > 0; @endphp
                        <tr>
                            <td class="kanal">{{ $row['channel'] }}</td>
                            @if ($hasChildren)
                                @foreach ($chunkMonths as $month)
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
                                @php $chunkSum = 0; @endphp
                                @foreach ($chunkMonths as $month)
                                    @if ($ringkas)
                                        @php
                                            $val = $row['perPeriod'][$month['key']] ?? 0;
                                            $chunkSum += $val;
                                        @endphp
                                        <td class="angka">{{ $val }}</td>
                                    @else
                                        @foreach ($classificationColumns as $column)
                                            @php
                                                $val = $row['perPeriod'][$month['key']][$column] ?? 0;
                                                $chunkSum += $val;
                                            @endphp
                                            <td class="angka">{{ $val }}</td>
                                        @endforeach
                                    @endif
                                @endforeach
                                <td class="angka" style="font-weight: bold;">{{ $chunkSum }}</td>
                            @endif
                        </tr>
                        @foreach ($row['children'] as $child)
                            <tr>
                                <td class="kanal" style="padding-left: 15px;">- {{ $child['channel'] }}</td>
                                @php $childChunkSum = 0; @endphp
                                @foreach ($chunkMonths as $month)
                                    @if ($ringkas)
                                        @php
                                            $val = $child['perPeriod'][$month['key']] ?? 0;
                                            $childChunkSum += $val;
                                        @endphp
                                        <td class="angka">{{ $val }}</td>
                                    @else
                                        @foreach ($classificationColumns as $column)
                                            @php
                                                $val = $child['perPeriod'][$month['key']][$column] ?? 0;
                                                $childChunkSum += $val;
                                            @endphp
                                            <td class="angka">{{ $val }}</td>
                                        @endforeach
                                    @endif
                                @endforeach
                                <td class="angka">{{ $childChunkSum }}</td>
                            </tr>
                        @endforeach
                    @empty
                        <tr>
                            <td colspan="{{ count($chunkMonths) * $columnsPerMonth + 2 }}" style="text-align: center; padding: 20px;">
                                Tidak ada data pada periode ini
                            </td>
                        </tr>
                    @endforelse
                </tbody>
                <tfoot>
                    <tr class="total">
                        <td>TOTAL</td>
                        @php $totalChunkSum = 0; @endphp
                        @foreach ($chunkMonths as $month)
                            @if ($ringkas)
                                @php
                                    $val = $tableTotals[$month['key']] ?? 0;
                                    $totalChunkSum += $val;
                                @endphp
                                <td class="angka">{{ $val }}</td>
                            @else
                                @foreach ($classificationColumns as $column)
                                    @php
                                        $val = $tableTotals[$month['key']][$column] ?? 0;
                                        $totalChunkSum += $val;
                                    @endphp
                                    <td class="angka">{{ $val }}</td>
                                @endforeach
                            @endif
                        @endforeach
                        <td class="angka" style="font-weight: bold;">{{ $totalChunkSum }}</td>
                    </tr>
                </tfoot>
            </table>

            @if ($isLastChunk && isset($penandaTangan))
                <div class="ttd-container clearfix">
                    <div class="ttd-box">
                        <div>{{ $penandaTangan['kota'] ?? 'Pekanbaru' }}, {{ $penandaTangan['tanggal'] ?? now()->translatedFormat('j F Y') }}</div>
                        <div style="font-weight: bold; margin-top: 2px;">{{ $penandaTangan['jabatan'] ?? 'KETUA TIM PENGADUAN' }}</div>
                        <div class="ttd-space"></div>
                        <div class="ttd-nama">{{ $penandaTangan['nama'] ?? '-' }}</div>
                    </div>
                </div>
            @endif
        </div>
    @endforeach
@endcomponent
