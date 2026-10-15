<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class LaporanFilter
{
    public const PER_PAGE_OPTIONS = [10, 15, 20, 50, 100];

    public string $search;

    public string $tab;

    public int $perPage;

    public int $page;

    public ?string $from;

    public ?string $to;

    public bool $isSemuaWaktu;

    public function __construct(Request $request, string $defaultDateMode = 'bulan_ini', int $defaultPerPage = 15)
    {
        $this->search = trim((string) ($request->query('q', $request->query('search', ''))));
        $this->tab = (string) ($request->query('tab', $request->query('filter', 'semua')));
        $this->perPage = (int) $request->query('per_page', $defaultPerPage);
        $this->page = (int) $request->query('page', 1);

        if (! in_array($this->perPage, self::PER_PAGE_OPTIONS, true)) {
            $this->perPage = $defaultPerPage;
        }

        [$this->from, $this->to, $this->isSemuaWaktu] = self::resolveDateRange($request, $defaultDateMode);
    }

    public static function resolveDateRange(Request $request, string $defaultMode = 'bulan_ini'): array
    {
        $fromInput = $request->query('from');
        $toInput = $request->query('to');
        $tz = 'Asia/Jakarta';

        if ($fromInput === null && $toInput === null) {
            if ($defaultMode === 'semua') {
                return ['semua', 'semua', true];
            }
            $now = Carbon::now($tz);

            return [
                $now->copy()->startOfMonth()->toDateString(),
                $now->copy()->endOfMonth()->toDateString(),
                false,
            ];
        }

        $isSemuaWaktu = ($fromInput === 'semua' || $toInput === 'semua');

        if ($isSemuaWaktu) {
            return ['semua', 'semua', true];
        }

        if ($fromInput && $toInput) {
            try {
                $fromDate = Carbon::parse($fromInput, $tz)->toDateString();
                $toDate = Carbon::parse($toInput, $tz)->toDateString();
                if ($toDate < $fromDate) {
                    $toDate = $fromDate;
                }

                return [$fromDate, $toDate, false];
            } catch (\Throwable) {
                // Fallback
            }
        }

        if ($defaultMode === 'semua') {
            return ['semua', 'semua', true];
        }

        $now = Carbon::now($tz);

        return [
            $now->copy()->startOfMonth()->toDateString(),
            $now->copy()->endOfMonth()->toDateString(),
            false,
        ];
    }

    public function toCacheParams(): array
    {
        return [
            'tab' => $this->tab,
            'from' => $this->from,
            'to' => $this->to,
            'per_page' => $this->perPage,
            'page' => $this->page,
            'q' => $this->search,
        ];
    }

    public function toFilterProps(string $frontendTabAlias = 'permintaan'): array
    {
        $frontendTab = ($this->tab === 'permintaan_informasi') ? $frontendTabAlias : $this->tab;

        return [
            'search' => $this->search,
            'filter' => $frontendTab,
            'per_page' => $this->perPage,
            'from' => $this->from,
            'to' => $this->to,
        ];
    }
}
