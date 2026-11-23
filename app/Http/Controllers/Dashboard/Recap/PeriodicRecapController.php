<?php

namespace App\Http\Controllers\Dashboard\Recap;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Models\Ticket;
use App\Support\ExportFilename;
use App\Support\RekapCache;
use App\Support\RekapReport;
use App\Support\RekapYears;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class PeriodicRecapController extends Controller
{
    private const MONTH_NAMES = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
        5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
        9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember',
    ];

    /** Fallback ketika config tidak tersedia. */
    private const FALLBACK_CHAT_LIMIT = 500;

    public function __invoke(Request $request): Response
    {
        [$year, $months] = $this->resolveParams($request->query('year'), $request->query('months'));
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));
        $chat = $this->resolveChatParam($request->query('chat'));
        $chatLimit = $this->resolveChatLimit($request->query('chat_limit'));
        $status = $this->resolveStatusParam($request->query('status'));

        return Inertia::render('dashboard/admin/recap/periodic-recap/index', array_merge(
            $this->payloadWithMode($year, $months, $tampilan, $status),
            $this->filterPayload($year, $months, $tampilan, $chat, $chatLimit, $status)
        ));
    }

    public function print(Request $request): View
    {
        [$year, $months] = $this->resolveParams($request->query('year'), $request->query('months'));
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));
        $chat = $this->resolveChatParam($request->query('chat'));
        $chatLimit = $this->resolveChatLimit($request->query('chat_limit'));
        $status = $this->resolveStatusParam($request->query('status'));
        $withChat = ($chat !== '0');

        $chatMonths = [];
        if ($withChat) {
            $chatMonths = array_map('intval', explode(',', $chat));
        }

        $data = array_merge(
            $this->payloadWithMode($year, $months, $tampilan, $status),
            $this->filterPayload($year, $months, $tampilan, $chat, $chatLimit, $status),
            [
                'withChat' => $withChat,
                'chatTickets' => $withChat ? $this->getChatTickets($year, $chatMonths, $chatLimit, $status) : collect(),
                'chatTotalCount' => $withChat ? $this->getChatTotalCount($year, $chatMonths, $status) : 0,
                'chatLimitReached' => $withChat ? $this->isChatLimitReached($year, $chatMonths, $chatLimit, $status) : false,
                'chatLimit' => $chatLimit,
                'status' => $status,
            ]
        );

        return view('recap.periodik-print', $data);
    }

    public function excel(Request $request): \Illuminate\Http\Response
    {
        [$year, $months] = $this->resolveParams($request->query('year'), $request->query('months'));
        $tampilan = RekapReport::normalizeViewMode($request->query('tampilan'));
        $status = $this->resolveStatusParam($request->query('status'));

        $monthsStr = count($months) === 12 ? 'Full' : implode('-', $months);
        $periodeStr = $year.'-M'.$monthsStr.($tampilan === RekapReport::VIEW_MODE_RINGKAS ? '-ringkas' : '');
        $filename = ExportFilename::make('Rekap-Periodik', $periodeStr, 'xls');

        return response()
            ->view('recap.periodik-excel', array_merge(
                $this->payloadWithMode($year, $months, $tampilan, $status),
                $this->filterPayload($year, $months, $tampilan, '0', 500, $status)
            ))
            ->header('Content-Type', 'application/vnd.ms-excel; charset=utf-8')
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
    }

    /**
     * @param  list<int>  $months
     */
    private function payloadWithMode(int $year, array $months, string $tampilan, string $status = 'all'): array
    {
        $payload = $this->payload($year, $months, $status);
        $extra = [
            'tampilan' => $tampilan,
            'penandaTangan' => RekapReport::signatory(),
        ];

        if ($tampilan !== RekapReport::VIEW_MODE_RINGKAS) {
            return array_merge($payload, $extra);
        }

        return array_merge($payload, $extra, [
            'ringkasRows' => RekapReport::summaryRows($payload['rows']),
            'ringkasTotals' => RekapReport::summaryTotals($payload['totals']),
        ]);
    }

    /**
     * @param  list<int>  $months
     */
    private function payload(int $year, array $months, string $status = 'all'): array
    {
        $currentYear = (int) now()->year;
        $ttl = ($year < $currentYear) ? RekapCache::TTL : 60;
        $cacheKey = $year.':'.implode(',', $months).':'.$status;

        return Cache::remember(
            RekapCache::key('periodik', $cacheKey),
            $ttl,
            fn (): array => $this->buildReport($year, $months, $status),
        );
    }

    /**
     * @return array{0: int, 1: list<int>}
     */
    private function resolveParams(mixed $yearInput, mixed $monthsInput): array
    {
        $currentYear = (int) now()->year;
        $years = RekapYears::get();
        $minYear = (int) min($years);
        $maxYear = $currentYear;

        $year = filter_var($yearInput, FILTER_VALIDATE_INT);
        if ($year === false || $year < $minYear || $year > $maxYear) {
            $year = $currentYear;
        }

        $selectedMonths = [];
        if (is_array($monthsInput)) {
            $rawMonths = $monthsInput;
        } elseif (is_string($monthsInput) && trim($monthsInput) !== '') {
            $rawMonths = explode(',', $monthsInput);
        } else {
            $rawMonths = range(1, 12);
        }

        foreach ($rawMonths as $m) {
            $mInt = filter_var($m, FILTER_VALIDATE_INT);
            if ($mInt !== false && $mInt >= 1 && $mInt <= 12) {
                $selectedMonths[] = $mInt;
            }
        }

        $selectedMonths = array_values(array_unique($selectedMonths));
        sort($selectedMonths);

        if (empty($selectedMonths)) {
            $selectedMonths = range(1, 12);
        }

        return [$year, $selectedMonths];
    }

    /**
     * @param  list<int>  $months
     */
    private function filterPayload(int $selectedYear, array $selectedMonths, string $tampilan, string $chat = '0', int $chatLimit = 500, string $status = 'all'): array
    {
        $years = RekapYears::get();
        $yearOptions = array_map(fn (string $y): array => [
            'value' => $y,
            'label' => 'Tahun '.$y,
        ], $years);

        $monthOptions = [];
        foreach (self::MONTH_NAMES as $num => $name) {
            $monthOptions[] = [
                'value' => (string) $num,
                'label' => $name,
            ];
        }

        return [
            'year' => (string) $selectedYear,
            'selectedMonths' => array_map('strval', $selectedMonths),
            'years' => $yearOptions,
            'monthOptions' => $monthOptions,
            'periodeLabel' => $this->periodeLabel($selectedYear, $selectedMonths),
            'tampilan' => $tampilan,
            'chat' => $chat,
            'chat_limit' => (string) $chatLimit,
            'status' => $status,
            'chat_limit_max' => (int) config('recap.chat_max', 2000),
            'chat_warning_threshold' => (int) config('recap.chat_warning_threshold', 500),
        ];
    }

    private function resolveStatusParam(mixed $statusInput): string
    {
        $allowed = ['all', 'proses', 'selesai'];

        return is_string($statusInput) && in_array($statusInput, $allowed, true) ? $statusInput : 'all';
    }

    private function resolveChatParam(mixed $chatInput): string
    {
        // Accept '0' (tanpa chat) or comma‑separated month numbers like '1,2,3'.
        if (is_string($chatInput) && $chatInput !== '' && $chatInput !== '0') {
            // Validate each month 1‑12, remove duplicates, sort.
            $parts = explode(',', $chatInput);
            $months = [];
            foreach ($parts as $p) {
                $m = filter_var($p, FILTER_VALIDATE_INT);
                if ($m !== false && $m >= 1 && $m <= 12) {
                    $months[] = $m;
                }
            }
            if (! empty($months)) {
                $months = array_unique($months);
                sort($months);

                return implode(',', $months);
            }
        }

        return '0';
    }

    private function resolveChatLimit(mixed $input): int
    {
        $default = (int) config('recap.chat_default', self::FALLBACK_CHAT_LIMIT);
        $max = (int) config('recap.chat_max', 2000);

        $value = filter_var($input, FILTER_VALIDATE_INT);
        if ($value === false || $value < 1) {
            $value = $default;
        }

        return min($value, $max);
    }

    /**
     * Memuat tiket beserta seluruh riwayat balasan dan lampiran untuk cetak PDF.
     * Menggunakan eager loading untuk menghindari N+1.
     *
     * @param  list<int>  $months
     * @return Collection<int, Ticket>
     */
    private function getChatTickets(int $year, array $months, int $limit = 500, string $status = 'all')
    {
        $periods = array_map(fn (int $m): string => sprintf('%04d-%02d', $year, $m), $months);

        $query = Ticket::with([
            'channel',
            'attachments',
            'responses' => fn ($query) => $query->orderBy('created_at')->orderBy('id')->with(['user', 'attachments']),
        ])
            ->whereIn('period', $periods);

        RekapReport::applyStatusFilter($query, $status);

        return $query
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc')
            ->limit($limit)
            ->get();
    }

    /**
     * @param  list<int>  $months
     */
    private function getChatTotalCount(int $year, array $months, string $status = 'all'): int
    {
        $periods = array_map(fn (int $m): string => sprintf('%04d-%02d', $year, $m), $months);

        $query = Ticket::whereIn('period', $periods);
        RekapReport::applyStatusFilter($query, $status);

        return $query->count();
    }

    /**
     * @param  list<int>  $months
     */
    private function isChatLimitReached(int $year, array $months, int $limit = 500, string $status = 'all'): bool
    {
        return $this->getChatTotalCount($year, $months, $status) > $limit;
    }

    /**
     * @param  list<int>  $months
     */
    private function buildReport(int $year, array $months, string $status = 'all'): array
    {
        $periods = array_map(fn (int $m): string => sprintf('%04d-%02d', $year, $m), $months);
        $counts = RekapReport::countsByChannelPerPeriod($periods, $status);

        $rows = Channel::with('children')
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->get()
            ->map(function (Channel $channel) use ($counts, $periods): array {
                $row = $this->rowFor($channel, true, $periods, $counts);
                $row['children'] = $channel->children
                    ->map(fn (Channel $child): array => $this->rowFor($child, false, $periods, $counts))
                    ->all();

                return $row;
            })
            ->all();

        $totals = [];
        $totals['jumlah'] = 0;
        foreach ($periods as $period) {
            $totals[$period] = array_fill_keys(RekapReport::COLUMNS, 0);
        }

        foreach ($rows as $row) {
            $this->accumulateTotals($totals, $row);
            foreach ($row['children'] as $child) {
                $this->accumulateTotals($totals, $child);
            }
        }

        return [
            'rows' => $rows,
            'totals' => $totals,
            'months' => array_map(fn (string $period): array => [
                'key' => $period,
                'label' => self::MONTH_NAMES[(int) substr($period, 5, 2)],
            ], $periods),
        ];
    }

    /**
     * @param  list<int>  $months
     */
    private function periodeLabel(int $year, array $months): string
    {
        if (count($months) === 12) {
            return 'Tahun '.$year.' (Januari - Desember)';
        }

        if (count($months) === 1) {
            return self::MONTH_NAMES[$months[0]].' '.$year;
        }

        // Cek apakah berurutan (consecutive)
        $isConsecutive = true;
        for ($i = 1; $i < count($months); $i++) {
            if ($months[$i] !== $months[$i - 1] + 1) {
                $isConsecutive = false;
                break;
            }
        }

        if ($isConsecutive) {
            $first = self::MONTH_NAMES[$months[0]];
            $last = self::MONTH_NAMES[end($months)];

            return sprintf('%s - %s %d', $first, $last, $year);
        }

        $names = array_map(fn (int $m) => self::MONTH_NAMES[$m], $months);
        if (count($names) <= 3) {
            return implode(', ', $names).' '.$year;
        }

        return count($months).' Bulan Terpilih Tahun '.$year;
    }

    /**
     * @param  list<string>  $periods
     * @param  array<int, array<string, array<string, int>>>  $counts
     */
    private function rowFor(Channel $channel, bool $isParent, array $periods, array $counts): array
    {
        $channelCounts = $counts[$channel->id] ?? [];
        $row = [
            'channel' => $channel->name,
            'isParent' => $isParent,
            'perPeriod' => [],
            'children' => [],
            'jumlah' => 0,
        ];

        $jumlah = 0;
        foreach ($periods as $period) {
            $periodCounts = $channelCounts[$period] ?? [];
            $periodValues = [];
            $periodSum = 0;

            foreach (RekapReport::COLUMNS as $column) {
                $value = $periodCounts[$column] ?? 0;
                $periodValues[$column] = $value;
                $periodSum += $value;
            }

            $row['perPeriod'][$period] = $periodValues;
            $jumlah += $periodSum;
        }

        $row['jumlah'] = $jumlah;

        return $row;
    }

    private function accumulateTotals(array &$totals, array $row): void
    {
        foreach ($row['perPeriod'] as $period => $counts) {
            if (! isset($totals[$period])) {
                $totals[$period] = array_fill_keys(RekapReport::COLUMNS, 0);
            }

            foreach (RekapReport::COLUMNS as $column) {
                $totals[$period][$column] += $counts[$column] ?? 0;
            }
        }

        $totals['jumlah'] += $row['jumlah'];
    }
}
