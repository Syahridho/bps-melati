@component('rekap.layouts.pdf', [
    'orientasi' => 'landscape',
    'marginHalaman' => '8mm',
    'title' => 'Rekapitulasi Laporan Periodik ' . $periodeLabel,
])
    @php
        $classificationColumns = ['pengaduan_pst', 'pengaduan_lainnya', 'aspirasi', 'permintaan_informasi'];
        $ringkas = ($tampilan ?? 'detail') === 'ringkas';
        $tableRows = $ringkas ? ($ringkasRows ?? $rows) : $rows;
        $tableTotals = $ringkas ? ($ringkasTotals ?? $totals) : $totals;

        $columnsPerMonth = $ringkas ? 1 : 4;
        $judulDokumen = 'REKAP LAPORAN PERIODIK BPS PROVINSI RIAU';
        $subjudulDokumen = $periodeLabel;

        $n = count($months);
        $chunks = $n <= 4 ? [$months] : [
            array_slice($months, 0, (int) ceil($n / 2)),
            array_slice($months, (int) ceil($n / 2)),
        ];
        $totalPages = count($chunks);
    @endphp

    <style>
        col.kolom-kanal { width: 18%; }
        col.kolom-angka { width: {{ $ringkas ? (75 / max(count($months), 1)) . '%' : (75 / (max(count($months), 1) * 4)) . '%' }}; }
        col.kolom-jumlah { width: 7%; }
        th, td {
            padding: 2.5px 4px;
            font-size: 7.5pt;
        }
    </style>

    @foreach ($chunks as $pageIndex => $chunkMonths)
        @php
            $isLastPage = ($pageIndex === $totalPages - 1);
            $currentSubjudul = $subjudulDokumen . ($pageIndex > 0 ? ' (LANJUTAN)' : '');
        @endphp
        <div class="page-section">
            @include('rekap.partials.letterhead', ['judulDokumen' => $judulDokumen, 'subjudulDokumen' => $currentSubjudul])

            <table class="{{ $ringkas ? 'ringkas' : 'detail' }}">
                <colgroup>
                    <col class="kolom-kanal" style="width: {{ $isLastPage ? '18%' : '22%' }};">
                    @foreach ($chunkMonths as $month)
                        @foreach (range(1, $columnsPerMonth) as $ignored)
                            <col class="kolom-angka">
                        @endforeach
                    @endforeach
                    @if ($isLastPage)
                        <col class="kolom-jumlah" style="width: 7%;">
                    @endif
                </colgroup>
                <thead>
                    <tr>
                        <th @if(! $ringkas) rowspan="2" @endif>Sumber Kanal</th>
                        @foreach ($chunkMonths as $month)
                            <th @if(! $ringkas) colspan="4" @endif>{{ $month['label'] }}</th>
                        @endforeach
                        @if ($isLastPage)
                            <th @if(! $ringkas) rowspan="2" @endif>Total</th>
                        @endif
                    </tr>
                    @unless($ringkas)
                        <tr>
                            @foreach ($chunkMonths as $month)
                                <th>PST</th>
                                <th>Non<br>PST</th>
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
                                @foreach ($chunkMonths as $month)
                                    @if ($ringkas)
                                        <td class="angka"></td>
                                    @else
                                        @foreach ($classificationColumns as $column)
                                            <td class="angka"></td>
                                        @endforeach
                                    @endif
                                @endforeach
                                @if ($isLastPage)
                                    <td class="angka"></td>
                                @endif
                            @else
                                @php $allSum = 0; @endphp
                                @foreach ($months as $month)
                                    @php
                                        $val = $ringkas ? ($row['perPeriod'][$month['key']] ?? 0) : array_sum($row['perPeriod'][$month['key']] ?? []);
                                        $allSum += $val;
                                    @endphp
                                @endforeach

                                @foreach ($chunkMonths as $month)
                                    @if ($ringkas)
                                        @php $val = $row['perPeriod'][$month['key']] ?? 0; @endphp
                                        <td class="angka">{{ $val }}</td>
                                    @else
                                        @foreach ($classificationColumns as $column)
                                            @php $val = $row['perPeriod'][$month['key']][$column] ?? 0; @endphp
                                            <td class="angka">{{ $val }}</td>
                                        @endforeach
                                    @endif
                                @endforeach

                                @if ($isLastPage)
                                    <td class="angka" style="font-weight: bold; background: #f9fafb !important;">{{ $allSum }}</td>
                                @endif
                            @endif
                        </tr>
                        @foreach ($row['children'] as $child)
                            <tr>
                                <td class="kanal" style="padding-left: 15px;">- {{ $child['channel'] }}</td>
                                @if ($ringkas)
                                    @php $childAllSum = 0; @endphp
                                    @foreach ($months as $month)
                                        @php $childAllSum += ($child['perPeriod'][$month['key']] ?? 0); @endphp
                                    @endforeach
                                    @foreach ($chunkMonths as $month)
                                        <td class="angka">{{ $child['perPeriod'][$month['key']] ?? 0 }}</td>
                                    @endforeach
                                @else
                                    @php $childAllSum = 0; @endphp
                                    @foreach ($months as $month)
                                        @php $childAllSum += array_sum($child['perPeriod'][$month['key']] ?? []); @endphp
                                    @endforeach
                                    @foreach ($chunkMonths as $month)
                                        @foreach ($classificationColumns as $column)
                                            <td class="angka">{{ $child['perPeriod'][$month['key']][$column] ?? 0 }}</td>
                                        @endforeach
                                    @endforeach
                                @endif
                                @if ($isLastPage)
                                    <td class="angka" style="font-weight: bold; background: #f9fafb !important;">{{ $childAllSum }}</td>
                                @endif
                            </tr>
                        @endforeach
                    @empty
                        <tr>
                            <td class="tengah" colspan="{{ count($chunkMonths) * $columnsPerMonth + ($isLastPage ? 2 : 1) }}">Belum ada data.</td>
                        </tr>
                    @endforelse
                </tbody>
                <tfoot>
                    <tr>
                        <td class="kanal">TOTAL</td>
                        @foreach ($chunkMonths as $month)
                            @if ($ringkas)
                                <td class="angka">{{ $tableTotals[$month['key']] ?? 0 }}</td>
                            @else
                                @foreach ($classificationColumns as $column)
                                    <td class="angka">{{ $tableTotals[$month['key']][$column] ?? 0 }}</td>
                                @endforeach
                            @endif
                        @endforeach
                        @if ($isLastPage)
                            <td class="angka" style="background: #f3f4f6 !important;">{{ $tableTotals['jumlah'] }}</td>
                        @endif
                    </tr>
                </tfoot>
            </table>

            @if ($isLastPage)
                <div class="keterangan">
                    @if ($ringkas)
                        Keterangan: Angka menunjukkan jumlah PST + NonPST + Asp + Inf.
                    @else
                        Keterangan: PST = Pengaduan Layanan PST, NonPST = Pengaduan Layanan Lainnya, Asp = Aspirasi, Inf = Permintaan Informasi.
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
            @endif
        </div>
    @endforeach

    @if (($chatMode ?? 'semua') === 'dengan' && !empty($ticketsData))
        <div style="page-break-before: always;"></div>
        <div style="font-size: 14pt; font-weight: bold; margin-bottom: 15px; text-align: center; text-transform: uppercase;">
            RIWAYAT PERCAKAPAN TIKET (DENGAN CHAT)
        </div>
        @foreach ($ticketsData as $ticket)
            <div style="page-break-inside: avoid; margin-bottom: 20px; border: 1px solid #ccc; padding: 12px; border-radius: 6px; background: #fafafa;">
                <div style="font-weight: bold; font-size: 11pt; margin-bottom: 4px; color: #005fb6;">
                    No. Tiket: {{ $ticket['ticket_number'] }} &nbsp;|&nbsp; Klasifikasi: {{ ucfirst($ticket['classification']) }} &nbsp;|&nbsp; Kanal: {{ $ticket['channel']['name'] ?? '-' }}
                </div>
                <div style="font-size: 9pt; color: #555; margin-bottom: 8px;">
                    Pelapor: {{ $ticket['reporter_name'] }} | Tanggal Masuk: {{ \Carbon\Carbon::parse($ticket['created_at'])->format('d/m/Y H:i') }}
                </div>
                <div style="background: #fff; padding: 8px; border: 1px solid #e5e7eb; border-radius: 4px; margin-bottom: 10px;">
                    <strong style="font-size: 9pt; color: #111;">Isi Laporan:</strong>
                    <div style="font-size: 9pt; margin-top: 2px; white-space: pre-wrap;">{{ $ticket['content'] }}</div>
                </div>

                @if (!empty($ticket['responses']))
                    <div style="margin-top: 8px; font-weight: bold; font-size: 9.5pt; border-bottom: 1px solid #ddd; padding-bottom: 3px;">Riwayat Percakapan / Tanggapan:</div>
                    @foreach ($ticket['responses'] as $resp)
                        <div style="margin-top: 6px; background: {{ $resp['user_id'] ? '#f0fdf4' : '#fffbeb' }}; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
                            <div style="font-size: 8.5pt; font-weight: bold; color: {{ $resp['user_id'] ? '#166534' : '#b45309' }}; margin-bottom: 2px;">
                                {{ $resp['user_id'] ? 'Petugas BPS (' . ($resp['user']['name'] ?? 'Staff') . ')' : 'Pelapor (' . $ticket['reporter_name'] . ')' }} 
                                &bull; <span style="font-weight: normal; color: #666;">{{ ucfirst(str_replace('_', ' ', $resp['type'])) }}</span>
                                &bull; <span style="font-weight: normal; color: #666;">{{ \Carbon\Carbon::parse($resp['created_at'])->format('d/m/Y H:i') }}</span>
                            </div>
                            <div style="font-size: 9pt; white-space: pre-wrap;">{{ $resp['message'] }}</div>
                        </div>
                    @endforeach
                @else
                    <div style="font-size: 8.5pt; font-style: italic; color: #666; margin-top: 6px;">Belum ada balasan/tanggapan.</div>
                @endif
            </div>
        @endforeach
    @endif
@endcomponent
