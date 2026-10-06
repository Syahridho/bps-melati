<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    @verbatim
    <!--[if gte mso 9]>
    <xml>
        <x:ExcelWorkbook>
            <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                    <x:Name>Rekap Tahunan</x:Name>
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
        $totalCols = count($months) * 4 + 2;
    @endphp
    <table>
        <tr>
            <td colspan="{{ $totalCols }}" class="title">REKAP PENGADUAN BPS PROVINSI RIAU</td>
        </tr>
        <tr>
            <td colspan="{{ $totalCols }}" class="subtitle">{{ mb_strtoupper($yearLabel) }}</td>
        </tr>
        <tr>
            <td colspan="{{ $totalCols }}"></td>
        </tr>
        <thead>
            <tr>
                <th rowspan="2" class="header">Kanal</th>
                @foreach ($months as $month)
                    <th colspan="4" class="header">{{ $month['label'] }}</th>
                @endforeach
                <th rowspan="2" class="header">Jumlah</th>
            </tr>
            <tr>
                @foreach ($months as $month)
                    <th class="header">PST</th>
                    <th class="header">Lain</th>
                    <th class="header">Asp</th>
                    <th class="header">Inf</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                @php $hasChildren = count($row['children'] ?? []) > 0; @endphp
                <tr class="{{ $hasChildren ? 'induk' : '' }}">
                    <td class="kanal">{{ $row['channel'] }}</td>
                    @if ($hasChildren)
                        @foreach ($months as $month)
                            @foreach ($classificationColumns as $column)
                                <td class="angka"></td>
                            @endforeach
                        @endforeach
                        <td class="angka"></td>
                    @else
                        @foreach ($months as $month)
                            @foreach ($classificationColumns as $column)
                                <td class="angka">{{ $row['perPeriod'][$month['key']][$column] ?? 0 }}</td>
                            @endforeach
                        @endforeach
                        <td class="angka">{{ $row['jumlah'] }}</td>
                    @endif
                </tr>

                @foreach ($row['children'] as $child)
                    <tr>
                        <td class="kanal">&nbsp;&nbsp;&nbsp;&nbsp;{{ $child['channel'] }}</td>
                        @foreach ($months as $month)
                            @foreach ($classificationColumns as $column)
                                <td class="angka">{{ $child['perPeriod'][$month['key']][$column] ?? 0 }}</td>
                            @endforeach
                        @endforeach
                        <td class="angka">{{ $child['jumlah'] }}</td>
                    </tr>
                @endforeach
            @empty
                <tr>
                    <td colspan="{{ $totalCols }}" style="text-align: center;">Belum ada data untuk periode ini.</td>
                </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr class="total">
                <td class="kanal">TOTAL</td>
                @foreach ($months as $month)
                    @foreach ($classificationColumns as $column)
                        <td class="angka">{{ $totals[$month['key']][$column] ?? 0 }}</td>
                    @endforeach
                @endforeach
                <td class="angka">{{ $totals['jumlah'] }}</td>
            </tr>
        </tfoot>
    </table>

    <br/>
    <div>
        Keterangan: PST = Pengaduan Layanan PST, Lain = Pengaduan Layanan Lainnya, Asp = Aspirasi, Inf = Permintaan Informasi.
    </div>

    <br/><br/>
    <table>
        <tr>
            <td colspan="{{ $totalCols - 6 }}"></td>
            <td colspan="6" style="text-align: center;">
                {{ $penandaTangan['kota'] }}, {{ $penandaTangan['tanggal'] }}<br/>
                <b>{{ $penandaTangan['jabatan'] }}</b><br/><br/><br/><br/>
                <u><b>{{ $penandaTangan['nama'] ?: 'NAMA NYA' }}</b></u>
            </td>
        </tr>
    </table>
</body>
</html>
