<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    @verbatim
    <!--[if gte mso 9]>
    <xml>
        <x:ExcelWorkbook>
            <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                    <x:Name>Rekap Bulanan</x:Name>
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
        th, td { border: 1px solid #000000; padding: 6px 8px; vertical-align: middle; }
        .title { font-size: 14pt; font-weight: bold; text-align: center; }
        .subtitle { font-size: 11pt; font-weight: bold; text-align: center; }
        .header { background-color: #e5e7eb; font-weight: bold; text-align: center; }
        .sub-header { font-size: 9pt; font-weight: normal; }
        .kanal { text-align: left; mso-number-format: "\@"; }
        .angka { text-align: center; mso-number-format: "#,##0"; }
        .induk { background-color: #e5e7eb; font-weight: bold; }
        .total { background-color: #e5e7eb; font-weight: bold; text-align: center; }
    </style>
</head>
<body>
    <table>
        <tr>
            <td colspan="6" class="title">REKAP PENGADUAN BPS PROVINSI RIAU</td>
        </tr>
        <tr>
            <td colspan="6" class="subtitle">BULAN : {{ mb_strtoupper($periodLabel) }}</td>
        </tr>
        <tr>
            <td colspan="6"></td>
        </tr>
        <thead>
            <tr>
                <th rowspan="2" class="header">Kanal</th>
                <th colspan="2" class="header">Pengaduan</th>
                <th rowspan="2" class="header">Aspirasi</th>
                <th rowspan="2" class="header">Permintaan Informasi</th>
                <th rowspan="2" class="header">Jumlah</th>
            </tr>
            <tr>
                <th class="header">Layanan PST <span class="sub-header">(Pelayanan Statistik Terpadu)</span></th>
                <th class="header">Layanan Lainnya</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                @php $hasChildren = isset($row['children']) && count($row['children']) > 0; @endphp
                <tr class="{{ $hasChildren ? 'induk' : '' }}">
                    <td class="kanal">{{ $row['channel'] }}</td>
                    @if ($hasChildren)
                        <td colspan="5"></td>
                    @else
                        <td class="angka">{{ $row['pengaduan_pst'] }}</td>
                        <td class="angka">{{ $row['pengaduan_lainnya'] }}</td>
                        <td class="angka">{{ $row['aspirasi'] }}</td>
                        <td class="angka">{{ $row['permintaan_informasi'] }}</td>
                        <td class="angka">{{ $row['jumlah'] }}</td>
                    @endif
                </tr>

                @if ($hasChildren)
                    @foreach ($row['children'] as $child)
                        <tr>
                            <td class="kanal">&nbsp;&nbsp;&nbsp;&nbsp;{{ $child['channel'] }}</td>
                            <td class="angka">{{ $child['pengaduan_pst'] }}</td>
                            <td class="angka">{{ $child['pengaduan_lainnya'] }}</td>
                            <td class="angka">{{ $child['aspirasi'] }}</td>
                            <td class="angka">{{ $child['permintaan_informasi'] }}</td>
                            <td class="angka">{{ $child['jumlah'] }}</td>
                        </tr>
                    @endforeach
                @endif
            @empty
                <tr>
                    <td colspan="6" style="text-align: center;">Belum ada data untuk periode ini.</td>
                </tr>
            @endforelse
        </tbody>
        <tfoot>
            <tr class="total">
                <td>TOTAL</td>
                <td class="angka">{{ $totals['pengaduan_pst'] }}</td>
                <td class="angka">{{ $totals['pengaduan_lainnya'] }}</td>
                <td class="angka">{{ $totals['aspirasi'] }}</td>
                <td class="angka">{{ $totals['permintaan_informasi'] }}</td>
                <td class="angka">{{ $totals['jumlah'] }}</td>
            </tr>
        </tfoot>
    </table>

    <br/><br/>
    <table>
        <tr>
            <td colspan="4"></td>
            <td colspan="2" style="text-align: center;">
                {{ $penandaTangan['kota'] }}, {{ $penandaTangan['tanggal'] }}<br/>
                <b>{{ $penandaTangan['jabatan'] }}</b><br/><br/><br/><br/>
                <u><b>{{ $penandaTangan['nama'] ?: 'NAMA NYA' }}</b></u>
            </td>
        </tr>
    </table>
</body>
</html>
