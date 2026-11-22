<?php

namespace App\Services;

use App\Models\Ticket;
use App\Support\CacheKeys;
use App\Support\InboxCounter;
use App\Support\LaporanCache;
use App\Support\RekapCache;
use Illuminate\Support\Facades\Cache;

class TicketCacheInvalidator
{
    public function invalidateTicket(?Ticket $ticket = null): void
    {
        if ($ticket !== null) {
            Cache::forget(CacheKeys::TICKET_CHECK_PREFIX . md5((string) $ticket->ticket_number));
            Cache::forget(CacheKeys::TICKET_DETAIL_PREFIX . $ticket->ticket_number);
        }

        LaporanCache::invalidate();
        RekapCache::invalidate();
        InboxCounter::invalidate();

        if (! Cache::has(CacheKeys::DASHBOARD_ADMIN_VERSION)) {
            Cache::add(CacheKeys::DASHBOARD_ADMIN_VERSION, 0);
        }
        Cache::increment(CacheKeys::DASHBOARD_ADMIN_VERSION);

        Cache::forget(CacheKeys::DASHBOARD_ADMIN_STATS);
        Cache::forget(CacheKeys::DASHBOARD_OPERATOR_STATS);
    }

    public function invalidateDashboard(): void
    {
        if (! Cache::has(CacheKeys::DASHBOARD_ADMIN_VERSION)) {
            Cache::add(CacheKeys::DASHBOARD_ADMIN_VERSION, 0);
        }
        Cache::increment(CacheKeys::DASHBOARD_ADMIN_VERSION);
        Cache::forget(CacheKeys::DASHBOARD_ADMIN_STATS);
        Cache::forget(CacheKeys::DASHBOARD_OPERATOR_STATS);
    }
}