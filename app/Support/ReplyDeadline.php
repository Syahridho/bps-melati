<?php

namespace App\Support;

use App\Actions\AutoCloseTickets;
use App\Models\Setting;
use App\Models\Ticket;
use Illuminate\Support\Carbon;

class ReplyDeadline
{
    public const SETTING_KEYS = AutoCloseTickets::SETTING_KEYS;

    public static function for(Ticket $ticket): ?Carbon
    {
        if ($ticket->status === 'selesai') {
            return null;
        }

        $settingKey = $ticket->is_berkadar_pengawasan
            ? 'auto_close_berkadar_pengawasan_days'
            : (self::SETTING_KEYS[$ticket->classification] ?? null);

        if (! $settingKey) {
            return null;
        }

        $rawDays = Setting::get($settingKey, $ticket->is_berkadar_pengawasan ? '30' : null);
        if ($rawDays === null || trim((string) $rawDays) === '' || ! ctype_digit(trim((string) $rawDays))) {
            return null;
        }

        $days = (int) $rawDays;
        if ($days <= 0) {
            return null;
        }

        $latestResponse = $ticket->relationLoaded('responses')
            ? $ticket->responses->where('is_system', false)->sortByDesc(fn ($r) => [$r->created_at, $r->id])->first()
            : $ticket->responses()->where('is_system', false)->orderByDesc('created_at')->orderByDesc('id')->first();

        if ($latestResponse && $latestResponse->user_id !== null) {
            return null;
        }

        $referenceTime = $latestResponse && $latestResponse->user_id === null
            ? ($latestResponse->sent_at ?? $latestResponse->created_at)
            : $ticket->created_at;

        return Carbon::parse($referenceTime)->addDays($days);
    }
}
