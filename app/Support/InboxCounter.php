<?php

namespace App\Support;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Notifications\DatabaseNotification as Notification;
use Illuminate\Support\Facades\Cache;

class InboxCounter
{
    private const COUNTS_TTL = 30;
    private const MY_REPORTS_TTL = 30;
    private const UNREAD_TTL = 15;

    /**
     * @return array{
     *     semua: int,
     *     belum_dibaca: int,
     *     pengaduan: int,
     *     aspirasi: int,
     *     permintaan: int,
     *     respon_awal: int,
     *     respon_substantif: int
     * }
     */
    public static function getCounts(?User $user = null): array
    {
        if ($user !== null && ! $user->isAdmin() && ! $user->isOperator()) {
            return [
                'semua' => 0,
                'belum_dibaca' => 0,
                'pengaduan' => 0,
                'aspirasi' => 0,
                'permintaan' => 0,
                'respon_awal' => 0,
                'respon_substantif' => 0,
            ];
        }

        $key = 'inbox:counts:' . self::version();

        try {
            return Cache::remember($key, self::COUNTS_TTL, function (): array {
                return self::computeCounts();
            });
        } catch (\Throwable $e) {
            return self::computeCounts();
        }
    }

    /**
     * Jumlah tiket aktif yang PIC-nya adalah operator tersebut.
     * Dipakai badge menu "Laporan Saya".
     */
    public static function getAssignedActiveCount(?User $user = null): int
    {
        if ($user === null || ! $user->isOperator()) {
            return 0;
        }

        $key = 'inbox:myreports:' . $user->id . ':' . self::version();

        try {
            return (int) Cache::remember($key, self::MY_REPORTS_TTL, function () use ($user): int {
                return (int) Ticket::query()
                    ->where('assigned_to', $user->id)
                    ->where('status', '!=', 'selesai')
                    ->count();
            });
        } catch (\Throwable $e) {
            return (int) Ticket::query()
                ->where('assigned_to', $user->id)
                ->where('status', '!=', 'selesai')
                ->count();
        }
    }

    /**
     * Jumlah notifikasi belum dibaca untuk user login.
     */
    public static function getUnreadCount(?User $user = null): int
    {
        if ($user === null) {
            return 0;
        }

        $key = 'inbox:unread:' . $user->id;

        try {
            return (int) Cache::remember($key, self::UNREAD_TTL, function () use ($user): int {
                return (int) Notification::where('notifiable_type', $user->getMorphClass())
                    ->where('notifiable_id', $user->id)
                    ->whereNull('read_at')
                    ->count();
            });
        } catch (\Throwable $e) {
            return (int) Notification::where('notifiable_type', $user->getMorphClass())
                ->where('notifiable_id', $user->id)
                ->whereNull('read_at')
                ->count();
        }
    }

    /**
     * Rotate version token so all cached inbox counters are regenerated.
     */
    public static function invalidate(): void
    {
        try {
            Cache::forever('inbox:version', (string) hrtime(true));
        } catch (\Throwable $e) {
            // ignore
        }
    }

    public static function version(): string
    {
        try {
            return (string) Cache::rememberForever('inbox:version', fn (): string => (string) hrtime(true));
        } catch (\Throwable $e) {
            return (string) hrtime(true);
        }
    }

    private static function computeCounts(): array
    {
        $row = Ticket::query()
            ->where('source_app', '!=', 'admin')
            ->where('status', '!=', 'selesai')
            ->selectRaw("
                COUNT(*) as semua,
                SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as belum_dibaca,
                SUM(CASE WHEN classification = 'pengaduan' THEN 1 ELSE 0 END) as pengaduan,
                SUM(CASE WHEN classification = 'aspirasi' THEN 1 ELSE 0 END) as aspirasi,
                SUM(CASE WHEN classification = 'permintaan_informasi' THEN 1 ELSE 0 END) as permintaan,
                SUM(CASE WHEN status = 'respon_awal' THEN 1 ELSE 0 END) as respon_awal,
                SUM(CASE WHEN status = 'respon_substantif' THEN 1 ELSE 0 END) as respon_substantif
            ")
            ->first();

        return [
            'semua' => (int) ($row?->semua ?? 0),
            'belum_dibaca' => (int) ($row?->belum_dibaca ?? 0),
            'pengaduan' => (int) ($row?->pengaduan ?? 0),
            'aspirasi' => (int) ($row?->aspirasi ?? 0),
            'permintaan' => (int) ($row?->permintaan ?? 0),
            'respon_awal' => (int) ($row?->respon_awal ?? 0),
            'respon_substantif' => (int) ($row?->respon_substantif ?? 0),
        ];
    }
}