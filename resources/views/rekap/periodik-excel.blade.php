<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    @verbatim
    <!--[if gte mso 9]>
    <xml>
        <x:ExcelWorkbook>
            <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                    <x:Name>Rekap Periodik</x:Name>
                    <x:WorksheetOptions>
                        <x:DisplayGridlines/>
                    </x:WorksheetOptions>
                </x:ExcelWorksheet>
            </x:ExcelWorksheets>
        </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    @endverbatim
    <style>
        table { border-collapse: collapse; }
        th, td { border: 1px solid #000000; padding: 4px 6px; vertical-align: middle; }
        .title { font-size: 14pt; font-weight: bold; text-align: center; }
        .subtitle { font-size: 11pt; font-weight: bold; text-align: center; }
        .header { background-color: #e5e7eb; font-weight: bold; text-align: center; }
        .kanal { text-align: left; mso-number-format: "\@"; }
        .angka { text-align: center; mso-number-format: "#,##0"; }
        .induk { background-color: #d1d5db; font-weight: bold; }
        .total { background-color: #e5e7eb; font-weight: bold; text-align: center; }
    </style>
</head>
<body>
    @php
        $classificationColumns = ['pengaduan_pst', 'pengaduan_lainnya', 'aspirasi', 'permintaan_informasi'];

        $ringkas = ($tampilan ?? 'detail') === 'ringkas';
        $tableRows = $ringkas ? ($ringkasRows ?? $rows) : $rows;
        $tableTotals = $ringkas ? ($ringkasTotals ?? $totals) : $totals;
        $columnsPerMonth = $ringkas ? 1 : 4;
        $totalCols = count($months) * $columnsPerMonth + 2;
    @endphp
    <table>
        <tr>
            <td colspan="{{ $totalCols }}" class="title">REKAP PENGADUAN BPS PROVINSI RIAU</td>
        </tr>
        <tr>
            <td colspan="{{ $totalCols }}" class="subtitle">{{ mb_strtoupper($periodeLabel) }}</td>
        </tr>
        <tr>
            <td colspan="{{ $totalCols }}"></td>
        </tr>
        <tr>
            <th @if(! $ringkas) rowspan="2" @endif class="header">Sumber Kanal</th>
            @foreach ($months as $month)
                <th @if(! $ringkas) colspan="4" @endif class="header">{{ $month['label'] }}</th>
            @endforeach
            <th @if(! $ringkas) rowspan="2" @endif class="header">Jumlah</th>
        </tr>
        @unless($ringkas)
            <tr>
                @foreach ($months as $month)
                    <th class="header">PST</th>
                    <th class="header">NonPST</th>
                    <th class="header">Asp</th>
                    <th class="header">Inf</th>
                @endforeach
            </tr>
        @endunless

        @forelse ($tableRows as $row)
            @php $hasChildren = count($row['children'] ?? []) > 0; @endphp
            <tr @if($hasChildren) class="induk" @endif>
                <td class="kanal">{{ $row['channel'] }}</td>
                @if ($hasChildren)
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
                <tr>
                    <td class="kanal">&nbsp;&nbsp;- {{ $child['channel'] }}</td>
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
                <td colspan="{{ $totalCols }}" class="angka">Tidak ada data</td>
            </tr>
        @endforelse

        <tr class="total">
            <td class="header">TOTAL</td>
            @foreach ($months as $month)
                @if ($ringkas)
                    <td class="angka header">{{ $tableTotals[$month['key']] ?? 0 }}</td>
                @else
                    @foreach ($classificationColumns as $column)
                        <td class="angka header">{{ $tableTotals[$month['key']][$column] ?? 0 }}</td>
                    @endforeach
                @endif
            @endforeach
            <td class="angka header">{{ $tableTotals['jumlah'] }}</td>
        </tr>

        @if(! empty($penandaTangan['nama']))
            <tr><td colspan="{{ $totalCols }}"></td></tr>
            <tr>
                <td colspan="{{ max(1, $totalCols - 3) }}"></td>
                <td colspan="3" style="text-align: center;">{{ $penandaTangan['kota'] ?? 'Pekanbaru' }}, {{ $penandaTangan['tanggal'] ?? '' }}</td>
            </tr>
            <tr>
                <td colspan="{{ max(1, $totalCols - 3) }}"></td>
                <td colspan="3" style="text-align: center;">{{ $penandaTangan['jabatan'] ?? 'KETUA TIM PENGADUAN' }}</td>
            </tr>
            <tr><td colspan="{{ $totalCols }}"></td></tr>
            <tr><td colspan="{{ $totalCols }}"></td></tr>
            <tr><td colspan="{{ $totalCols }}"></td></tr>
            <tr>
                <td colspan="{{ max(1, $totalCols - 3) }}"></td>
                <td colspan="3" style="text-align: center; font-weight: bold; text-decoration: underline;">{{ $penandaTangan['nama'] }}</td>
            </tr>
        @endif
    </table>
</body>
</html>
