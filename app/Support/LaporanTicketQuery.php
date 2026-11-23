<?php

namespace App\Support;

use App\Models\Ticket;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query dasar daftar laporan aktif yang dipakai bersama oleh Laporan Masuk
 * dan Laporan Saya agar filter, eager loading, dan pencarian tidak duplikat.
 */
class LaporanTicketQuery
{
    /**
     * @param  int|null  $assignedTo  Batasi ke PIC tertentu (Laporan Saya).
     * @param  bool  $excludeAdminSource  Laporan Masuk mengabaikan tiket input manual admin.
     */
    public static function activeList(
        LaporanFilter $filter,
        ?int $assignedTo = null,
        bool $excludeAdminSource = true,
    ): Builder {
        return Ticket::query()
            ->with(['channel', 'lastResponse.user', 'flaggedBy', 'assignedTo'])
            ->when($excludeAdminSource, function (Builder $query): void {
                $query->where('source_app', '!=', 'admin');
            })
            ->where('status', '!=', 'selesai')
            ->when($assignedTo !== null, function (Builder $query) use ($assignedTo): void {
                $query->where('assigned_to', $assignedTo);
            })
            ->when(! $filter->isSemuaWaktu && $filter->from && $filter->to, function (Builder $query) use ($filter): void {
                $query->where('created_at', '>=', $filter->from.' 00:00:00')
                    ->where('created_at', '<=', $filter->to.' 23:59:59');
            })
            ->tap(LaporanFilterQuery::searchClosure($filter->search));
    }
}
