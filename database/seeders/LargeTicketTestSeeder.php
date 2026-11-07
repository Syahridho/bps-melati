<?php

namespace Database\Seeders;

use App\Models\Channel;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LargeTicketTestSeeder extends Seeder
{
    public function run(): void
    {
        $channelIds = Channel::whereNotNull('parent_id')->pluck('id')->all();
        if (empty($channelIds)) {
            $channelIds = Channel::pluck('id')->all();
        }

        if (empty($channelIds)) {
            $this->command->error('Tabel channels masih kosong! Jalankan ChannelSeeder terlebih dahulu.');
            return;
        }

        $totalRecords = 100000;
        $chunkSize = 2000;

        $startDate = Carbon::create(2026, 1, 1, 0, 0, 0);
        $endDate = Carbon::now();
        $startTs = $startDate->timestamp;
        $endTs = max($startTs + 1, $endDate->timestamp);

        $statuses = ['baru', 'respon_awal', 'respon_substantif', 'selesai'];
        $classifications = ['pengaduan', 'aspirasi', 'permintaan_informasi'];
        $serviceTypes = ['pst', 'lainnya'];
        $satuanTugasList = ['Bagian Umum', 'Fungsi Statistik Sosial', 'Fungsi Statistik Produksi', 'Fungsi Statistik Distribusi', 'Fungsi Neraca Wilayah', 'Fungsi IPDS'];

        // Ambil urutan terakhir per periode dari DB agar unik
        $existingSequences = DB::table('tickets')
            ->select('period', DB::raw('MAX(sequence) as max_seq'))
            ->groupBy('period')
            ->pluck('max_seq', 'period')
            ->map(fn ($val) => (int) $val)
            ->all();

        $periodsSequence = $existingSequences;

        $this->command->info("Membuat {$totalRecords} tiket uji (Januari 2026 - Sekarang)...");

        $chunksCount = (int) ceil($totalRecords / $chunkSize);

        for ($c = 0; $c < $chunksCount; $c++) {
            $currentChunkLimit = min($chunkSize, $totalRecords - ($c * $chunkSize));
            $records = [];

            for ($i = 0; $i < $currentChunkLimit; $i++) {
                $randomTs = mt_rand($startTs, $endTs);
                $createdAt = Carbon::createFromTimestamp($randomTs);
                $period = $createdAt->format('Y-m');

                if (!isset($periodsSequence[$period])) {
                    $periodsSequence[$period] = 0;
                }
                $periodsSequence[$period]++;
                $seq = $periodsSequence[$period];

                $classification = $classifications[array_rand($classifications)];
                $prefix = match ($classification) {
                    'pengaduan' => 'L',
                    'aspirasi' => 'A',
                    'permintaan_informasi' => 'I',
                };

                $monthStr = $createdAt->format('m');
                $yearStr = $createdAt->format('Y');
                $ticketNumber = sprintf('%s-%04d/%s/%s', $prefix, $seq, $monthStr, $yearStr);

                $status = $statuses[array_rand($statuses)];
                $completedAt = null;
                $isRead = false;

                if ($status === 'selesai') {
                    $completedAt = (clone $createdAt)->addHours(mt_rand(2, 720));
                    if ($completedAt->gt($endDate)) {
                        $completedAt = (clone $endDate);
                    }
                    $isRead = true;
                } elseif ($status !== 'baru') {
                    $isRead = true;
                } else {
                    $isRead = (mt_rand(0, 1) === 1);
                }

                $serviceType = ($classification === 'pengaduan') ? $serviceTypes[array_rand($serviceTypes)] : null;
                $satuanTugas = ($classification === 'aspirasi') ? $satuanTugasList[array_rand($satuanTugasList)] : null;

                $records[] = [
                    'ticket_number' => $ticketNumber,
                    'period' => $period,
                    'sequence' => $seq,
                    'classification' => $classification,
                    'title' => 'Laporan uji coba nomor ' . $seq . ' (' . $classification . ')',
                    'service_type' => $serviceType,
                    'satuan_tugas' => $satuanTugas,
                    'channel_id' => $channelIds[array_rand($channelIds)],
                    'reporter_name' => 'Pelapor ' . mt_rand(100, 9999),
                    'reporter_email' => 'pelapor' . mt_rand(1, 5000) . '@example.com',
                    'reporter_wa' => '08' . mt_rand(1000000000, 9999999999),
                    'content' => 'Ini adalah konten pengaduan uji coba untuk beban data besar. Tiket nomor ' . $ticketNumber . ' dengan isu acak simulasi.',
                    'access_code' => strtoupper(Str::random(8)),
                    'status' => $status,
                    'version' => 1,
                    'is_read' => $isRead,
                    'source_app' => 'web',
                    'created_by' => null,
                    'completed_at' => $completedAt,
                    'created_at' => $createdAt,
                    'updated_at' => $completedAt ?? (clone $createdAt)->addMinutes(mt_rand(5, 300)),
                ];
            }

            DB::table('tickets')->insert($records);
            $this->command->line(sprintf('Progress: %d / %d records dimasukkan...', ($c + 1) * $chunkSize > $totalRecords ? $totalRecords : ($c + 1) * $chunkSize, $totalRecords));
        }

        $this->command->info("Selesai! {$totalRecords} tiket berhasil dibuat.");
    }
}
