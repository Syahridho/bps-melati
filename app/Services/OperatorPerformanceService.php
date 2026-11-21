<?php

namespace App\Services;

use App\Models\AuditFlag;
use App\Models\Ticket;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class OperatorPerformanceService
{
    public const MODE_OTOMATIS = 'otomatis';
    public const MODE_SELESAI = 'selesai';
    public const MODE_GABUNGAN = 'gabungan';

    // Ambil ticket IDs yang harus di-exclude dari perhitungan rating
    // berdasarkan audit flag status tindak_lanjut dengan exclude_rating = true
    protected function getExcludedTicketIds(): array
    {
        $excludedIds = AuditFlag::where('status', 'tindak_lanjut')
            ->where('exclude_rating', true)
            ->whereNotNull('ticket_id')
            ->pluck('ticket_id')
            ->toArray();

        return array_unique($excludedIds);
    }

    public function compute(array $params): array
    {
        $mode = $params['mode'] ?? self::MODE_GABUNGAN;
        $sort = $params['sort'] ?? 'completed';
        $direction = strtolower((string) ($params['direction'] ?? 'desc')) === 'asc' ? 'asc' : 'desc';
        $from = $params['from'] ?? null;
        $to = $params['to'] ?? null;
        $minRatings = (int) config('kinerja.min_ratings', 3);

        $tz = 'Asia/Jakarta';
        $isSemua = ($from === 'semua' || $to === 'semua' || $from === null || $to === null);
        $start = null;
        $end = null;
        if (! $isSemua) {
            try {
                $start = Carbon::parse((string) $from, $tz)->startOfDay();
                $end = Carbon::parse((string) $to, $tz)->endOfDay();
                if ($end->lt($start)) {
                    $end = $start->copy()->endOfDay();
                }
            } catch (\Throwable) {
                $isSemua = true;
            }
        }

        $roleValues = ['operator', 'operator_tim'];

        // Query A: tanpa filter exclude (untuk menghitung rating total/min_ratings)
        $completedQueryOriginal = Ticket::query()
            ->where('status', 'selesai')
            ->whereNotNull('assigned_to');

        if ($mode === self::MODE_OTOMATIS) {
            $completedQueryOriginal->where('closed_reason', 'auto_close');
        } elseif ($mode === self::MODE_SELESAI) {
            $completedQueryOriginal->where(function ($q) {
                $q->whereNull('closed_reason')
                    ->orWhere('closed_reason', '!=', 'auto_close');
            });
        }

        if (! $isSemua && $start && $end) {
            $completedQueryOriginal->whereBetween('completed_at', [$start, $end]);
        }

        // Query B: dengan exclude ticket IDs yang memiliki flag exclude_rating=true dan status=tindak_lanjut
        $excludedTicketIds = $this->getExcludedTicketIds();

        $completedQueryFiltered = clone $completedQueryOriginal;
        if (! empty($excludedTicketIds)) {
            $completedQueryFiltered->whereNotIn('id', $excludedTicketIds);
        }

        // Ambil aggregat dari kedua query
        $completedAggOriginal = $completedQueryOriginal
            ->groupBy('assigned_to')
            ->select([
                'assigned_to',
                DB::raw('COUNT(*) as completed_count'),
                DB::raw('AVG(rating) as avg_rating'),
                DB::raw('COUNT(rating) as rating_count'),
                DB::raw('AVG(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as avg_duration_seconds'),
            ])
            ->get()
            ->keyBy('assigned_to');

        $completedAggFiltered = $completedQueryFiltered
            ->groupBy('assigned_to')
            ->select([
                'assigned_to',
                DB::raw('COUNT(*) as completed_count'),
                DB::raw('AVG(rating) as avg_rating'),
                DB::raw('COUNT(rating) as rating_count'),
                DB::raw('AVG(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as avg_duration_seconds'),
            ])
            ->get()
            ->keyBy('assigned_to');

        // Tiket selesai tanpa PIC pada periode yang sama (keterangan UI).
        $excludedQuery = Ticket::query()
            ->where('status', 'selesai')
            ->whereNull('assigned_to');

        if ($mode === self::MODE_OTOMATIS) {
            $excludedQuery->where('closed_reason', 'auto_close');
        } elseif ($mode === self::MODE_SELESAI) {
            $excludedQuery->where(function ($q) {
                $q->whereNull('closed_reason')
                    ->orWhere('closed_reason', '!=', 'auto_close');
            });
        }

        if (! $isSemua && $start && $end) {
            $excludedQuery->whereBetween('completed_at', [$start, $end]);
        }

        $excludedWithoutPic = (int) $excludedQuery->count();

        // Snapshot tiket aktif saat ini per PIC (tidak terpengaruh filter waktu).
        $inProgressAgg = Ticket::query()
            ->where('status', '!=', 'selesai')
            ->whereNotNull('assigned_to')
            ->groupBy('assigned_to')
            ->select(['assigned_to', DB::raw('COUNT(*) as in_progress_count')])
            ->get()
            ->keyBy('assigned_to');

        $operators = User::withTrashed()
            ->whereIn('role', $roleValues)
            ->get();

        $rows = [];
        foreach ($operators as $user) {
            $completedOriginal = $completedAggOriginal->get($user->id);
            $completedFiltered = $completedAggFiltered->get($user->id);
            $inProgress = $inProgressAgg->get($user->id);

            // Dari query asli: rating count dan avg rating lengkap (untuk meets_min_ratings)
            $origRatingCount = $completedOriginal ? (int) $completedOriginal->rating_count : 0;
            $origAvgRating = $completedOriginal ? round((float) $completedOriginal->avg_rating, 1) : null;

            // Dari query filter: rating count dan avg rating setelah exclude flag dihapus
            $filteredRatingCount = $completedFiltered ? (int) $completedFiltered->rating_count : 0;
            $filteredAvgRating = $completedFiltered ? round((float) $completedFiltered->avg_rating, 1) : null;

            // Gunakan rating setelah exclude untuk menampilkan di UI
            // tapi hitsung meets_min_ratings berdasarkan rating asli (total) agar operator tetap tampil
            $ratingCount = $origRatingCount;
            $avgRating = $filteredAvgRating;
            $completedCount = $completedOriginal ? (int) $completedOriginal->completed_count : 0;

            $inProgressCount = $inProgress ? (int) $inProgress->in_progress_count : 0;

            $isActive = (bool) $user->is_active;
            $isDeleted = $user->trashed();

            // Operator nonaktif/soft-deleted hanya tampil jika punya aktivitas.
            if (! $isActive || $isDeleted) {
                if ($completedCount === 0 && $inProgressCount === 0 && $ratingCount === 0) {
                    continue;
                }
            }

            $rows[] = [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role->value,
                'is_active' => $isActive,
                'is_deleted' => $isDeleted,
                'completed' => $completedCount,
                'in_progress' => $inProgressCount,
                'rating' => $avgRating, // Rating setelah exclude flag ditampilkan di UI
                'rating_count' => $ratingCount, // Total rating sebelum exclude (untuk meets_min_ratings)
                'meets_min_ratings' => $ratingCount >= $minRatings,
                'avg_duration_seconds' => $completedOriginal ? (float) $completedOriginal->avg_duration_seconds : null,
                'avg_duration_human' => $this->formatDuration($completedOriginal ? (float) $completedOriginal->avg_duration_seconds : null),
            ];
        }

        // Sorting.
        $meets = fn (array $r): int => $r['meets_min_ratings'] ? 1 : 0;

        usort($rows, function (array $a, array $b) use ($sort, $direction, $meets) {
            if ($sort === 'rating') {
                // Operator memenuhi batas minimum tidak boleh disalip yang tidak memenuhi.
                $cmpMeets = $meets($b) <=> $meets($a);
                if ($cmpMeets !== 0) {
                    return $cmpMeets;
                }
            }

            $valA = $this->sortValue($a, $sort);
            $valB = $this->sortValue($b, $sort);

            if (is_string($valA) || is_string($valB)) {
                $cmp = strcasecmp((string) $valA, (string) $valB);
            } else {
                $cmp = ($valA ?? 0) <=> ($valB ?? 0);
            }

            if ($direction === 'asc') {
                return $cmp;
            }

            return -$cmp;
        });

        // Champions.
        $mostCompleted = null;
        $mostInProgress = null;
        $bestRating = null;

        if (! empty($rows)) {
            $mc = collect($rows)->sortByDesc('completed')->first();
            if ($mc && (int) $mc['completed'] > 0) {
                $mostCompleted = ['id' => $mc['id'], 'name' => $mc['name'], 'value' => (int) $mc['completed']];
            }

            $mp = collect($rows)->sortByDesc('in_progress')->first();
            if ($mp && (int) $mp['in_progress'] > 0) {
                $mostInProgress = ['id' => $mp['id'], 'name' => $mp['name'], 'value' => (int) $mp['in_progress']];
            }

            $qualified = collect($rows)->filter(fn ($r) => $r['meets_min_ratings'] && $r['rating'] !== null);
            if ($qualified->isEmpty()) {
                // Fallback: operator dengan penilaian tertinggi meski di bawah batas.
                $qualified = collect($rows)->filter(fn ($r) => $r['rating'] !== null);
            }
            if ($qualified->isNotEmpty()) {
                $br = $qualified->sortByDesc('rating')->first();
                $bestRating = ['id' => $br['id'], 'name' => $br['name'], 'value' => $br['rating'], 'count' => $br['rating_count']];
            }
        }

        $countedTickets = (int) collect($rows)->sum('completed');

        return [
            'operators' => $rows,
            'summary' => [
                'most_completed' => $mostCompleted,
                'most_in_progress' => $mostInProgress,
                'best_rating' => $bestRating,
            ],
            'totals' => [
                'counted_tickets' => $countedTickets,
                'excluded_without_pic' => $excludedWithoutPic,
            ],
            'meta' => [
                'min_ratings' => $minRatings,
                'mode' => $mode,
                'from' => $isSemua ? 'semua' : $start->toDateString(),
                'to' => $isSemua ? 'semua' : $end->toDateString(),
                'sort' => $sort,
                'direction' => $direction,
            ],
        ];
    }

    protected function sortValue(array $row, string $sort): mixed
    {
        return match ($sort) {
            'in_progress' => $row['in_progress'],
            'rating' => $row['rating'],
            'duration' => $row['avg_duration_seconds'],
            'name' => $row['name'],
            default => $row['completed'],
        };
    }

    protected function formatDuration(?float $seconds): string
    {
        if ($seconds === null || $seconds <= 0) {
            return '-';
        }

        $seconds = (int) round($seconds);
        $days = intdiv($seconds, 86400);
        $hours = intdiv($seconds % 86400, 3600);
        $minutes = intdiv($seconds % 3600, 60);

        if ($days > 0) {
            return $days . ' hari ' . $hours . ' jam';
        }

        if ($hours > 0) {
            return $hours . ' jam ' . $minutes . ' menit';
        }

        return $minutes . ' menit';
    }
}