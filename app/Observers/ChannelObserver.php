<?php

namespace App\Observers;

use App\Events\ChannelStatsUpdated;
use App\Models\Channel;
use App\Models\Setting;
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
        Cache::forget('channels:tree');
    }

    private function bump(Channel $channel, string $action): void
    {
        Cache::forget('channels:tree');
        Cache::add('dashboard:admin:version', 0);
        Cache::increment('dashboard:admin:version');

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
