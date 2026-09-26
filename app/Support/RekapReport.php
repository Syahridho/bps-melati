<?php

namespace App\Support;

use App\Models\Channel;
use App\Models\Setting;
use App\Models\Ticket;
use Illuminate\Support\Carbon;

/**
 * Helper bersama untuk rekap bulanan & semesteran: pemetaan klasifikasi ke
 * kolom tabel, agregasi tiket per kanal, dan penyusunan baris kanal
 * (induk + anak) beserta totalnya.
 */
class RekapReport
{
    /**
     * Kolom klasifikasi pada tabel rekap (di luar kolom "jumlah").
     *
     * @var list<string>
     */
    public const COLUMNS = ['pengaduan_pst', 'pengaduan_lainnya', 'aspirasi', 'permintaan_informasi'];

    /**
     * Pemetaan klasifikasi + service_type ke kolom tabel.
     */
    public static function columnFor(string $classification, ?string $serviceType): ?string
    {
        return match ($classification) {
            'pengaduan' => $serviceType === 'pst' ? 'pengaduan_pst' : 'pengaduan_lainnya',
            'aspirasi' => 'aspirasi',
            'permintaan_informasi' => 'permintaan_informasi',
            default => null,
        };
    }

    /**
     * Agregasi tiket per kanal, per kolom klasifikasi, untuk satu periode.
     *
     * @return array<int, array<string, int>>
     */
    public static function countsByChannel(string $period): array
    {
        $aggregates = Ticket::query()
            ->selectRaw('channel_id, classification, service_type, COUNT(*) as total')
            ->where('period', $period)
            ->groupBy('channel_id', 'classification', 'service_type')
            ->get();

        $counts = [];

        foreach ($aggregates as $aggregate) {
            $column = self::columnFor($aggregate->classification, $aggregate->service_type);

            if ($column === null) {
                continue;
            }

            $channelId = (int) $aggregate->channel_id;
            $counts[$channelId][$column] = ($counts[$channelId][$column] ?? 0) + (int) $aggregate->total;
        }

        return $counts;
    }

    /**
     * Agregasi tiket per kanal, per periode, per kolom klasifikasi.
     *
     * Dipakai rekap lintas bulan (semesteran) yang butuh sebaran tiap bulan.
     *
     * @param  list<string>  $periods
     * @return array<int, array<string, array<string, int>>>
     */
    public static function countsByChannelPerPeriod(array $periods): array
    {
        $aggregates = Ticket::query()
            ->selectRaw('channel_id, period, classification, service_type, COUNT(*) as total')
            ->whereIn('period', $periods)
            ->groupBy('channel_id', 'period', 'classification', 'service_type')
            ->get();

        $counts = [];

        foreach ($aggregates as $aggregate) {
            $column = self::columnFor($aggregate->classification, $aggregate->service_type);

            if ($column === null) {
                continue;
            }

            $channelId = (int) $aggregate->channel_id;
            $period = (string) $aggregate->period;

            $counts[$channelId][$period][$column] = ($counts[$channelId][$period][$column] ?? 0) + (int) $aggregate->total;
        }

        return $counts;
    }

    /**
     * Susun baris kanal (induk + anak) dari hasil agregasi.
     *
     * @param  array<string, mixed>  $counts
     * @return array{rows: list<array<string, mixed>>, totals: array<string, int>}
     */
    public static function rowsFor(array $counts): array
    {
        $rows = Channel::with('children')
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->get()
            ->map(function (Channel $channel) use ($counts): array {
                $row = self::rowFor($channel, true, $counts);

                $row['children'] = $channel->children
                    ->map(fn (Channel $child): array => self::rowFor($child, false, $counts))
                    ->all();

                return $row;
            })
            ->all();

        $totals = array_fill_keys(self::COLUMNS, 0);
        $totals['jumlah'] = 0;

        foreach ($rows as $row) {
            self::accumulate($totals, $row);

            foreach ($row['children'] as $child) {
                self::accumulate($totals, $child);
            }
        }

        return ['rows' => $rows, 'totals' => $totals];
    }

    /**
     * Daftar periode (Y-m) yang memiliki tiket, terbaru lebih dahulu.
     *
     * @return list<string>
     */
    public static function ticketPeriods(): array
    {
        return Ticket::query()
            ->distinct()
            ->orderByDesc('period')
            ->pluck('period')
            ->all();
    }

    /**
     * Format periode (Y-m) ke locale Indonesia.
     */
    public static function formatPeriod(string $period, string $format): string
    {
        return Carbon::createFromFormat('Y-m', $period)
            ->locale('id')
            ->translatedFormat($format);
    }

    /**
     * Blok penanda tangan dari tabel settings (tanggal memakai tanggal cetak).
     *
     * @return array<string, string|null>
     */
    public static function signatory(): array
    {
        return [
            'kota' => Setting::get('kota_penanda_tangan', 'Pekanbaru'),
            'jabatan' => Setting::get('jabatan_penanda_tangan', 'KETUA TIM PENGADUAN'),
            'nama' => Setting::get('nama_penanda_tangan'),
            'tanggal' => now()->locale('id')->translatedFormat('j F Y'),
        ];
    }

    /**
     * @param  array<int, array<string, int>>  $counts
     * @return array<string, mixed>
     */
    private static function rowFor(Channel $channel, bool $isParent, array $counts): array
    {
        $channelCounts = $counts[$channel->id] ?? [];

        $row = [
            'channel' => $channel->name,
            'isParent' => $isParent,
            'children' => [],
        ];

        $jumlah = 0;

        foreach (self::COLUMNS as $column) {
            $value = $channelCounts[$column] ?? 0;
            $row[$column] = $value;
            $jumlah += $value;
        }

        $row['jumlah'] = $jumlah;

        return $row;
    }

    /**
     * @param  array<string, int>  $totals
     * @param  array<string, mixed>  $row
     */
    private static function accumulate(array &$totals, array $row): void
    {
        foreach (self::COLUMNS as $column) {
            $totals[$column] += $row[$column];
        }

        $totals['jumlah'] += $row['jumlah'];
    }
}
