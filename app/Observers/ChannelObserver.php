<?php

namespace App\Observers;

use App\Events\ChannelStatsUpdated;
use App\Models\Channel;
use App\Models\Setting;
use App\Support\CacheKeys;
use App\Support\ChannelFilter;
use Illuminate\Support\Facades\Cache;

class ChannelObserver
{
    public function created(Channel $channel): void
    {
        $this->bump($channel, 'created');
    }

    public function updated(Channel $channel): void
    {
        $this->bump($channel, 'updated');
    }

    public function deleted(Channel $channel): void
    {
        $this->bump($channel, 'deleted');
    }

    private function bump(Channel $channel, string $action): void
    {
        ChannelFilter::forget();
        Cache::add(CacheKeys::DASHBOARD_ADMIN_VERSION, 0);
        Cache::increment(CacheKeys::DASHBOARD_ADMIN_VERSION);

        if (config('app.disable_dashboard_broadcast', false)) {
            return;
        }
        if (! (bool) Setting::get('dashboard_live_enabled', true)) {
            return;
        }

        event(new ChannelStatsUpdated(
            channelId: (int) $channel->id,
            action: $action,
            name: (string) $channel->name,
            color: $channel->color ?? $channel->parent?->color,
        ));
    }
}
