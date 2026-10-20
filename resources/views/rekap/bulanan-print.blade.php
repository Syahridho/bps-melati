@component('rekap.layouts.pdf', [
    'orientasi' => 'portrait',
    'marginHalaman' => '15mm',
    'title' => 'Rekap Pengaduan ' . $periodLabel,
])
    @php
        $judulDokumen = 'REKAP LAPORAN BULANAN BPS PROVINSI RIAU';
        $subjudulDokumen = 'Bulan : ' . $periodLabel;
    @endphp
    <style>
        col.kolom-kanal { width: 40%; }
        col.kolom-pst { width: 12%; }
        col.kolom-lainnya { width: 12%; }
        col.kolom-aspirasi { width: 12%; }
        col.kolom-info { width: 12%; }
        col.kolom-jumlah { width: 12%; }
    </style>

    @include('rekap.partials.letterhead', ['judulDokumen' => $judulDokumen, 'subjudulDokumen' => $subjudulDokumen])

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
                <th>Layanan NonPST</th>
            </tr>
        </thead>

        <tbody>
            @forelse ($rows as $row)
                @php
                    $hasChildren = isset($row['children']) && count($row['children']) > 0;
                @endphp

                <tr>
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
                    <tr>
                        <td class="kanal" style="padding-left: 15px;">- {{ $child['channel'] }}</td>
                        <td class="angka">{{ $child['pengaduan_pst'] }}</td>
                        <td class="angka">{{ $child['pengaduan_lainnya'] }}</td>
                        <td class="angka">{{ $child['aspirasi'] }}</td>
                        <td class="angka">{{ $child['permintaan_informasi'] }}</td>
                        <td class="angka">{{ $child['jumlah'] }}</td>
                    </tr>
                @endforeach
            @empty
                <tr>
                    <td class="tengah" colspan="6">Belum ada data untuk periode ini.</td>
                </tr>
            @endforelse
        </tbody>

        <tfoot>
            <tr>
                <td class="kanal">Total</td>
                <td class="angka">{{ $totals['pengaduan_pst'] }}</td>
                <td class="angka">{{ $totals['pengaduan_lainnya'] }}</td>
                <td class="angka">{{ $totals['aspirasi'] }}</td>
                <td class="angka">{{ $totals['permintaan_informasi'] }}</td>
                <td class="angka">{{ $totals['jumlah'] }}</td>
            </tr>
        </tfoot>
    </table>

    <div class="keterangan">
        Keterangan: PST = Pengaduan Layanan PST, NonPST = Pengaduan Layanan Lainnya, Aspirasi = Aspirasi, Permintaan Informasi = Permintaan Informasi.
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
@endcomponent
