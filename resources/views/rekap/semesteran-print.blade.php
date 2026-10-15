@component('rekap.layouts.pdf', [
    'orientasi' => 'landscape',
    'marginHalaman' => '10mm',
    'title' => 'Rekap Pengaduan ' . $semesterLabel,
])
    @php
        $classificationColumns = ['pengaduan_pst', 'pengaduan_lainnya', 'aspirasi', 'permintaan_informasi'];
        $ringkas = ($tampilan ?? 'detail') === 'ringkas';
        $tableRows = $ringkas ? ($ringkasRows ?? $rows) : $rows;
        $tableTotals = $ringkas ? ($ringkasTotals ?? $totals) : $totals;

        $half = (int) ceil(count($months) / 2);
        $part1Months = array_slice($months, 0, $half);
        $part2Months = array_slice($months, $half);

        $columnsPerMonth = $ringkas ? 1 : 4;
        $judulDokumen = 'REKAP LAPORAN SEMESTERAN BPS PROVINSI RIAU';
        $subjudulDokumen = $semesterLabel;
    @endphp

    <style>
        col.kolom-kanal { width: 25%; }
        col.kolom-angka { width: {{ $ringkas ? (65 / 3) . '%' : (65 / (3 * 4)) . '%' }}; }
        col.kolom-jumlah { width: 10%; }
        .sub-heading {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 2mm;
            text-transform: uppercase;
        }
    </style>

    {{-- BAGIAN 1: Halaman 1 --}}
    <div class="page-section">
        @include('rekap.partials.letterhead', ['judulDokumen' => $judulDokumen, 'subjudulDokumen' => $subjudulDokumen])
        <div class="sub-heading">Bagian 1: Triwulan Pertama Semester ({{ $part1Months[0]['label'] }} - {{ end($part1Months)['label'] }})</div>
        <table class="{{ $ringkas ? 'ringkas' : 'detail' }}">
            <colgroup>
                <col class="kolom-kanal">
                @foreach ($part1Months as $month)
                    @foreach (range(1, $columnsPerMonth) as $ignored)
                        <col class="kolom-angka">
                    @endforeach
                @endforeach
                <col class="kolom-jumlah">
            </colgroup>
            <thead>
                <tr>
                    <th @if(! $ringkas) rowspan="2" @endif>Sumber Kanal</th>
                    @foreach ($part1Months as $month)
                        <th @if(! $ringkas) colspan="4" @endif>{{ $month['label'] }}</th>
                    @endforeach
                    <th @if(! $ringkas) rowspan="2" @endif>Jumlah 3 Bulan</th>
                </tr>
                @unless($ringkas)
                    <tr>
                        @foreach ($part1Months as $month)
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
                    <tr>
                        <td class="kanal">{{ $row['channel'] }}</td>
                        @if ($hasChildren)
                            @foreach ($part1Months as $month)
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
                            @php $part1Sum = 0; @endphp
                            @foreach ($part1Months as $month)
                                @if ($ringkas)
                                    @php
                                        $val = $row['perPeriod'][$month['key']] ?? 0;
                                        $part1Sum += $val;
                                    @endphp
                                    <td class="angka">{{ $val }}</td>
                                @else
                                    @foreach ($classificationColumns as $column)
                                        @php
                                            $val = $row['perPeriod'][$month['key']][$column] ?? 0;
                                            $part1Sum += $val;
                                        @endphp
                                        <td class="angka">{{ $val }}</td>
                                    @endforeach
                                @endif
                            @endforeach
                            <td class="angka" style="font-weight: bold;">{{ $part1Sum }}</td>
                        @endif
                    </tr>
                    @foreach ($row['children'] as $child)
                        <tr>
                            <td class="kanal" style="padding-left: 15px;">- {{ $child['channel'] }}</td>
                            @php $childPart1Sum = 0; @endphp
                            @foreach ($part1Months as $month)
                                @if ($ringkas)
                                    @php
                                        $val = $child['perPeriod'][$month['key']] ?? 0;
                                        $childPart1Sum += $val;
                                    @endphp
                                    <td class="angka">{{ $val }}</td>
                                @else
                                    @foreach ($classificationColumns as $column)
                                        @php
                                            $val = $child['perPeriod'][$month['key']][$column] ?? 0;
                                            $childPart1Sum += $val;
                                        @endphp
                                        <td class="angka">{{ $val }}</td>
                                    @endforeach
                                @endif
                            @endforeach
                            <td class="angka" style="font-weight: bold;">{{ $childPart1Sum }}</td>
                        </tr>
                    @endforeach
                @empty
                    <tr>
                        <td class="tengah" colspan="{{ count($part1Months) * $columnsPerMonth + 2 }}">Belum ada data.</td>
                    </tr>
                @endforelse
            </tbody>
            <tfoot>
                <tr>
                    <td class="kanal">Total Bagian 1</td>
                    @php $totPart1Sum = 0; @endphp
                    @foreach ($part1Months as $month)
                        @if ($ringkas)
                            @php
                                $val = $tableTotals[$month['key']] ?? 0;
                                $totPart1Sum += $val;
                            @endphp
                            <td class="angka">{{ $val }}</td>
                        @else
                            @foreach ($classificationColumns as $column)
                                @php
                                    $val = $tableTotals[$month['key']][$column] ?? 0;
                                    $totPart1Sum += $val;
                                @endphp
                                <td class="angka">{{ $val }}</td>
                            @endforeach
                        @endif
                    @endforeach
                    <td class="angka">{{ $totPart1Sum }}</td>
                </tr>
            </tfoot>
        </table>
    </div>

    {{-- BAGIAN 2: Halaman 2 --}}
    <div class="page-section">
        @include('rekap.partials.letterhead', ['judulDokumen' => $judulDokumen, 'subjudulDokumen' => $subjudulDokumen])
        <div class="sub-heading">Bagian 2: Triwulan Kedua Semester ({{ $part2Months[0]['label'] }} - {{ end($part2Months)['label'] }}) & Total Semester</div>
        <table class="{{ $ringkas ? 'ringkas' : 'detail' }}">
            <colgroup>
                <col class="kolom-kanal">
                @foreach ($part2Months as $month)
                    @foreach (range(1, $columnsPerMonth) as $ignored)
                        <col class="kolom-angka">
                    @endforeach
                @endforeach
                <col class="kolom-jumlah">
            </colgroup>
            <thead>
                <tr>
                    <th @if(! $ringkas) rowspan="2" @endif>Sumber Kanal</th>
                    @foreach ($part2Months as $month)
                        <th @if(! $ringkas) colspan="4" @endif>{{ $month['label'] }}</th>
                    @endforeach
                    <th @if(! $ringkas) rowspan="2" @endif>Jumlah Semester</th>
                </tr>
                @unless($ringkas)
                    <tr>
                        @foreach ($part2Months as $month)
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
                    <tr>
                        <td class="kanal">{{ $row['channel'] }}</td>
                        @if ($hasChildren)
                            @foreach ($part2Months as $month)
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
                            @foreach ($part2Months as $month)
                                @if ($ringkas)
                                    <td class="angka">{{ $row['perPeriod'][$month['key']] ?? 0 }}</td>
                                @else
                                    @foreach ($classificationColumns as $column)
                                        <td class="angka">{{ $row['perPeriod'][$month['key']][$column] ?? 0 }}</td>
                                    @endforeach
                                @endif
                            @endforeach
                            <td class="angka" style="font-weight: bold; background: #f9fafb !important;">{{ $row['jumlah'] }}</td>
                        @endif
                    </tr>
                    @foreach ($row['children'] as $child)
                        <tr>
                            <td class="kanal" style="padding-left: 15px;">- {{ $child['channel'] }}</td>
                            @foreach ($part2Months as $month)
                                @if ($ringkas)
                                    <td class="angka">{{ $child['perPeriod'][$month['key']] ?? 0 }}</td>
                                @else
                                    @foreach ($classificationColumns as $column)
                                        <td class="angka">{{ $child['perPeriod'][$month['key']][$column] ?? 0 }}</td>
                                    @endforeach
                                @endif
                            @endforeach
                            <td class="angka" style="font-weight: bold; background: #f9fafb !important;">{{ $child['jumlah'] }}</td>
                        </tr>
                    @endforeach
                @empty
                    <tr>
                        <td class="tengah" colspan="{{ count($part2Months) * $columnsPerMonth + 2 }}">Belum ada data.</td>
                    </tr>
                @endforelse
            </tbody>
            <tfoot>
                <tr>
                    <td class="kanal">Total Semester</td>
                    @foreach ($part2Months as $month)
                        @if ($ringkas)
                            <td class="angka">{{ $tableTotals[$month['key']] ?? 0 }}</td>
                        @else
                            @foreach ($classificationColumns as $column)
                                <td class="angka">{{ $tableTotals[$month['key']][$column] ?? 0 }}</td>
                            @endforeach
                        @endif
                    @endforeach
                    <td class="angka" style="background: #f3f4f6 !important;">{{ $tableTotals['jumlah'] }}</td>
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

        @isset($penandaTangan)
            <div class="ttd-container clearfix">
                <div class="ttd-box">
                    <div>Pekanbaru, {{ $penandaTangan['tanggal'] ?? now()->translatedFormat('d F Y') }}</div>
                    <div style="font-weight: bold; margin-top: 2px;">{{ $penandaTangan['jabatan'] ?? 'Administrator' }}</div>
                    <div class="ttd-space"></div>
                    <div class="ttd-nama">{{ $penandaTangan['nama'] ?? '-' }}</div>
                </div>
            </div>
        @endisset
    </div>
@endcomponent
