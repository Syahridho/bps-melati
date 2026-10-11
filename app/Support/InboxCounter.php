<?php

namespace App\Support;

use App\Models\Ticket;
use App\Models\User;

class InboxCounter
{
    /**
     * Hitung semua metrik tab Laporan Masuk dengan SATU query agregat.
     *
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
