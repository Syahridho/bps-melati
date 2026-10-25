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

        /* Lampiran Percakapan */
        .lampiran-chat-container {
            page-break-before: always;
            break-before: page;
            margin-top: 5mm;
        }
        .lampiran-header {
            border-bottom: 2pt solid #000;
            padding-bottom: 2.5mm;
            margin-bottom: 5mm;
            page-break-after: avoid;
            break-after: avoid;
        }
        .lampiran-judul {
            font-size: 12pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #000;
        }
        .lampiran-subjudul {
            font-size: 8.5pt;
            color: #333;
            margin-top: 1mm;
        }
        .lampiran-warning {
            border: 1pt solid #b45309;
            background-color: #fffbeb;
            padding: 2.5mm 3.5mm;
            font-size: 7.5pt;
            color: #92400e;
            margin-bottom: 4mm;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .lampiran-empty {
            border: 1pt dashed #888;
            padding: 8mm;
            text-align: center;
            font-size: 8.5pt;
            color: #555;
            font-style: italic;
            background: #fafafa;
        }
        .chat-card {
            border: 0.75pt solid #555;
            margin-bottom: 5mm;
            background: #ffffff;
            page-break-inside: auto;
            break-inside: auto;
        }
        .chat-card-header {
            background: #f1f5f9;
            border-bottom: 0.75pt solid #555;
            padding: 2.5mm 3.5mm;
            page-break-after: avoid;
            break-after: avoid;
        }
        .chat-card-title-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            font-size: 8pt;
            font-weight: bold;
        }
        .chat-ticket-num {
            font-family: monospace;
            font-size: 8.5pt;
            color: #000;
        }
        .chat-ticket-date {
            font-size: 7.5pt;
            color: #444;
        }
        .chat-ticket-subject {
            font-size: 8.5pt;
            font-weight: bold;
            margin-top: 1mm;
            color: #000;
            word-break: break-word;
            overflow-wrap: anywhere;
        }
        .chat-ticket-meta {
            font-size: 7pt;
            color: #444;
            margin-top: 1mm;
        }
        .chat-card-body {
            padding: 2.5mm 3.5mm;
        }
        .chat-message-row {
            margin-bottom: 2.5mm;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .chat-message-row:last-child {
            margin-bottom: 0;
        }
        .msg-pelapor {
            border: 0.75pt solid #94a3b8;
            border-left: 3.5pt solid #1e293b;
            background: #f8fafc;
            padding: 2mm 3mm;
        }
        .msg-petugas {
            border: 0.75pt solid #94a3b8;
            border-left: 3.5pt solid #047857;
            background: #f0fdf4;
            padding: 2mm 3mm;
        }
        .msg-sistem {
            border: 0.75pt dashed #94a3b8;
            border-left: 3.5pt solid #64748b;
            background: #f8fafc;
            padding: 1.5mm 2.5mm;
        }
        .msg-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 7pt;
            margin-bottom: 1.5mm;
            border-bottom: 0.5pt solid #cbd5e1;
            padding-bottom: 0.8mm;
        }
        .msg-badge {
            display: inline-block;
            font-weight: bold;
            font-size: 6.5pt;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            padding: 0.5px 3.5px;
            border: 0.5pt solid #000;
            border-radius: 2px;
        }
        .msg-badge-pelapor {
            background: #e2e8f0;
            color: #0f172a;
        }
        .msg-badge-petugas {
            background: #dcfce7;
            color: #14532d;
        }
        .msg-badge-sistem {
            background: #f1f5f9;
            color: #334155;
        }
        .msg-sender-name {
            font-weight: bold;
            font-size: 7.5pt;
            margin-left: 4px;
            color: #000;
        }
        .msg-time {
            font-size: 7pt;
            color: #555;
        }
        .msg-content {
            font-size: 7.5pt;
            line-height: 1.35;
            color: #000;
            white-space: pre-wrap;
            word-break: break-word;
            overflow-wrap: anywhere;
        }
        .msg-attachment-info {
            margin-top: 1.2mm;
            font-size: 7pt;
            color: #475569;
            font-style: italic;
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

    @if ($withChat ?? false)
        <div class="lampiran-chat-container">
            <div class="lampiran-header">
                <div class="lampiran-judul">Lampiran: Daftar Percakapan Laporan</div>
                <div class="lampiran-subjudul">Periode: {{ $periodeLabel }}</div>
            </div>

            @if ($chatLimitReached ?? false)
                <div class="lampiran-warning">
                    <strong>Perhatian:</strong> Menampilkan {{ count($chatTickets) }} dari total {{ $chatTotalCount }} tiket dalam periode ini karena batas kapasitas dokumen. Untuk melihat percakapan selengkapnya, filter periode bulan yang lebih spesifik.
                </div>
            @endif

            @forelse ($chatTickets as $ticket)
                <div class="chat-card">
                    <div class="chat-card-header">
                        <div class="chat-card-title-row">
                            <span class="chat-ticket-num">{{ $ticket->ticket_number }}</span>
                            <span class="chat-ticket-date">{{ $ticket->created_at->translatedFormat('d F Y, H:i') }} WIB</span>
                        </div>
                        <div class="chat-ticket-subject">{{ $ticket->title }}</div>
                        <div class="chat-ticket-meta">
                            Klasifikasi: <strong>{{ ucfirst(str_replace('_', ' ', $ticket->classification)) }}</strong> &bull;
                            Kanal: <strong>{{ $ticket->channel?->name ?? '-' }}</strong> &bull;
                            Pelapor: <strong>{{ $ticket->reporter_name ?: 'Anonim' }}</strong>
                        </div>
                    </div>

                    <div class="chat-card-body">
                        {{-- Pesan Awal Pelapor --}}
                        <div class="chat-message-row msg-pelapor">
                            <div class="msg-header">
                                <div>
                                    <span class="msg-badge msg-badge-pelapor">PELAPOR</span>
                                    <span class="msg-sender-name">{{ $ticket->reporter_name ?: 'Pelapor' }}</span>
                                </div>
                                <span class="msg-time">{{ $ticket->created_at->translatedFormat('d M Y, H:i') }} WIB</span>
                            </div>
                            <div class="msg-content">{{ $ticket->content }}</div>
                            @if ($ticket->attachments && $ticket->attachments->isNotEmpty())
                                <div class="msg-attachment-info">
                                    @foreach ($ticket->attachments as $att)
                                        <div>[Lampiran: {{ $att->original_name }}]</div>
                                    @endforeach
                                </div>
                            @endif
                        </div>

                        {{-- Rangkaian Balasan Tanggapan --}}
                        @if ($ticket->responses && $ticket->responses->isNotEmpty())
                            @foreach ($ticket->responses as $response)
                                @php
                                    $isSystem = (bool) $response->is_system;
                                    $isReporter = $response->user_id === null || $response->type === 'balasan_pelapor';
                                    if ($isSystem) {
                                        $rowClass = 'msg-sistem';
                                        $badgeClass = 'msg-badge-sistem';
                                        $badgeLabel = 'SISTEM';
                                        $senderName = 'Sistem Otomatis';
                                    } elseif ($isReporter) {
                                        $rowClass = 'msg-pelapor';
                                        $badgeClass = 'msg-badge-pelapor';
                                        $badgeLabel = 'PELAPOR';
                                        $senderName = $ticket->reporter_name ?: 'Pelapor';
                                    } else {
                                        $rowClass = 'msg-petugas';
                                        $badgeClass = 'msg-badge-petugas';
                                        $badgeLabel = 'PETUGAS';
                                        $senderName = $response->user?->name ?? 'Petugas BPS';
                                    }
                                    $msgDate = $response->sent_at ?? $response->created_at;
                                @endphp

                                <div class="chat-message-row {{ $rowClass }}">
                                    <div class="msg-header">
                                        <div>
                                            <span class="msg-badge {{ $badgeClass }}">{{ $badgeLabel }}</span>
                                            <span class="msg-sender-name">{{ $senderName }}</span>
                                        </div>
                                        @if ($msgDate)
                                            <span class="msg-time">{{ $msgDate->translatedFormat('d M Y, H:i') }} WIB</span>
                                        @endif
                                    </div>
                                    <div class="msg-content">{{ $response->message }}</div>
                                    @if ($response->attachments && $response->attachments->isNotEmpty())
                                        <div class="msg-attachment-info">
                                            @foreach ($response->attachments as $att)
                                                <div>[Lampiran: {{ $att->original_name }}]</div>
                                            @endforeach
                                        </div>
                                    @endif
                                </div>
                            @endforeach
                        @endif
                    </div>
                </div>
            @empty
                <div class="lampiran-empty">
                    Tidak ada percakapan pada periode ini.
                </div>
            @endforelse
        </div>
    @endif
@endcomponent
