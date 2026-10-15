@component('rekap.layouts.pdf', [
    'orientasi' => 'landscape',
    'marginHalaman' => '8mm',
    'title' => 'Rekap Pengaduan ' . $yearLabel,
])
    @php
        $classificationColumns = ['pengaduan_pst', 'pengaduan_lainnya', 'aspirasi', 'permintaan_informasi'];
        $ringkas = ($tampilan ?? 'detail') === 'ringkas';
        $tableRows = $ringkas ? ($ringkasRows ?? $rows) : $rows;
        $tableTotals = $ringkas ? ($ringkasTotals ?? $totals) : $totals;

        $sem1Months = array_slice($months, 0, 6);
        $sem2Months = array_slice($months, 6, 6);

        $columnsPerMonth = $ringkas ? 1 : 4;
        $judulDokumen = 'REKAP LAPORAN TAHUNAN BPS PROVINSI RIAU';
        $subjudulDokumen = $yearLabel;
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
        col.kolom-angka { width: {{ $ringkas ? (75 / 6) . '%' : (75 / (6 * 4)) . '%' }}; }
        col.kolom-jumlah { width: 7%; }
        .sub-heading {
            font-size: 9.5pt;
            font-weight: bold;
            margin-bottom: 2mm;
            text-transform: uppercase;
        }
    </style>

    {{-- HALAMAN 1: Semester I (Januari - Juni) --}}
    <div class="page-section">
        @include('rekap.partials.letterhead', ['judulDokumen' => $judulDokumen, 'subjudulDokumen' => $subjudulDokumen])
        <div class="sub-heading">Semester I (Januari - Juni)</div>
        <table class="{{ $ringkas ? 'ringkas' : 'detail' }}">
            <colgroup>
                <col class="kolom-kanal">
                @foreach ($sem1Months as $month)
                    @foreach (range(1, $columnsPerMonth) as $ignored)
                        <col class="kolom-angka">
                    @endforeach
                @endforeach
                <col class="kolom-jumlah">
            </colgroup>
            <thead>
                <tr>
                    <th @if(! $ringkas) rowspan="2" @endif>Sumber Kanal</th>
                    @foreach ($sem1Months as $month)
                        <th @if(! $ringkas) colspan="4" @endif>{{ $month['label'] }}</th>
                    @endforeach
                    <th @if(! $ringkas) rowspan="2" @endif>Total</th>
                </tr>
                @unless($ringkas)
                    <tr>
                        @foreach ($sem1Months as $month)
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
                            @foreach ($sem1Months as $month)
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
                            @php $sem1Sum = 0; @endphp
                            @foreach ($sem1Months as $month)
                                @if ($ringkas)
                                    @php
                                        $val = $row['perPeriod'][$month['key']] ?? 0;
                                        $sem1Sum += $val;
                                    @endphp
                                    <td class="angka">{{ $val }}</td>
                                @else
                                    @foreach ($classificationColumns as $column)
                                        @php
                                            $val = $row['perPeriod'][$month['key']][$column] ?? 0;
                                            $sem1Sum += $val;
                                        @endphp
                                        <td class="angka">{{ $val }}</td>
                                    @endforeach
                                @endif
                            @endforeach
                            <td class="angka" style="font-weight: bold;">{{ $sem1Sum }}</td>
                        @endif
                    </tr>
                    @foreach ($row['children'] as $child)
                        <tr>
                            <td class="kanal" style="padding-left: 15px;">- {{ $child['channel'] }}</td>
                            @php $childSem1Sum = 0; @endphp
                            @foreach ($sem1Months as $month)
                                @if ($ringkas)
                                    @php
                                        $val = $child['perPeriod'][$month['key']] ?? 0;
                                        $childSem1Sum += $val;
                                    @endphp
                                    <td class="angka">{{ $val }}</td>
                                @else
                                    @foreach ($classificationColumns as $column)
                                        @php
                                            $val = $child['perPeriod'][$month['key']][$column] ?? 0;
                                            $childSem1Sum += $val;
                                        @endphp
                                        <td class="angka">{{ $val }}</td>
                                    @endforeach
                                @endif
                            @endforeach
                            <td class="angka" style="font-weight: bold;">{{ $childSem1Sum }}</td>
                        </tr>
                    @endforeach
                @empty
                    <tr>
                        <td class="tengah" colspan="{{ count($sem1Months) * $columnsPerMonth + 2 }}">Belum ada data.</td>
                    </tr>
                @endforelse
            </tbody>
            <tfoot>
                <tr>
                    <td class="kanal">Total Sem I</td>
                    @php $totSem1Sum = 0; @endphp
                    @foreach ($sem1Months as $month)
                        @if ($ringkas)
                            @php
                                $val = $tableTotals[$month['key']] ?? 0;
                                $totSem1Sum += $val;
                            @endphp
                            <td class="angka">{{ $val }}</td>
                        @else
                            @foreach ($classificationColumns as $column)
                                @php
                                    $val = $tableTotals[$month['key']][$column] ?? 0;
                                    $totSem1Sum += $val;
                                @endphp
                                <td class="angka">{{ $val }}</td>
                            @endforeach
                        @endif
                    @endforeach
                    <td class="angka">{{ $totSem1Sum }}</td>
                </tr>
            </tfoot>
        </table>
    </div>

    {{-- HALAMAN 2: Semester II (Juli - Desember) + Jumlah Setahun + Keterangan & TTD --}}
    <div class="page-section">
        @include('rekap.partials.letterhead', ['judulDokumen' => $judulDokumen, 'subjudulDokumen' => $subjudulDokumen])
        <div class="sub-heading">Semester II (Juli - Desember) & Total Setahun</div>
        <table class="{{ $ringkas ? 'ringkas' : 'detail' }}">
            <colgroup>
                <col class="kolom-kanal">
                @foreach ($sem2Months as $month)
                    @foreach (range(1, $columnsPerMonth) as $ignored)
                        <col class="kolom-angka">
                    @endforeach
                @endforeach
                <col class="kolom-jumlah">
            </colgroup>
            <thead>
                <tr>
                    <th @if(! $ringkas) rowspan="2" @endif>Sumber Kanal</th>
                    @foreach ($sem2Months as $month)
                        <th @if(! $ringkas) colspan="4" @endif>{{ $month['label'] }}</th>
                    @endforeach
                    <th @if(! $ringkas) rowspan="2" @endif>Total</th>
                </tr>
                @unless($ringkas)
                    <tr>
                        @foreach ($sem2Months as $month)
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
                            @foreach ($sem2Months as $month)
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
                            @foreach ($sem2Months as $month)
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
                            @foreach ($sem2Months as $month)
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
                        <td class="tengah" colspan="{{ count($sem2Months) * $columnsPerMonth + 2 }}">Belum ada data.</td>
                    </tr>
                @endforelse
            </tbody>
            <tfoot>
                <tr>
                    <td class="kanal">Total Setahun</td>
                    @foreach ($sem2Months as $month)
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
                    <div>Pekanbaru, {{ $penandaTangan['tanggal'] ?? now()->translatedFormat('j F Y') }}</div>
                    <div style="font-weight: bold; margin-top: 2px;">{{ $penandaTangan['jabatan'] ?? 'Administrator' }}</div>
                    <div class="ttd-space"></div>
                    <div class="ttd-nama">{{ $penandaTangan['nama'] ?? '-' }}</div>
                </div>
            </div>
        @endisset
    </div>
@endcomponent
