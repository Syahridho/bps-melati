<?php

namespace App\Services;

use App\Events\RatingSettingChanged;
use App\Models\Setting;
use App\Models\SettingChangeLog;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class RatingSettingService
{
    public const KEY = 'rating_enabled';

    public function enabled(): bool
    {
        return $this->readRaw() === '1';
    }

    public function update(bool $enabled, ?User $actor = null): bool
    {
        return DB::transaction(function () use ($enabled, $actor): bool {
            $old = $this->enabled();
            if ($old === $enabled) {
                return false;
            }

            Setting::set(self::KEY, $enabled ? '1' : '0');
            Cache::forget('setting:'.self::KEY);

            SettingChangeLog::create([
                'key' => self::KEY,
                'old_value' => $old ? '1' : '0',
                'new_value' => $enabled ? '1' : '0',
                'changed_by' => $actor?->id,
                'scheduled_at' => now(),
                'applied_at' => now(),
            ]);

            AuditLogger::log(
                eventType: 'setting.rating_enabled_changed',
                category: 'setting',
                actor: $actor,
                meta: [
                    'key' => self::KEY,
                    'old_value' => $old ? '1' : '0',
                    'new_value' => $enabled ? '1' : '0',
                ],
                severity: 'notice',
            );

            RatingSettingChanged::dispatch(
                $enabled,
                $actor?->name,
                now()->toIso8601String(),
            );

            return true;
        });
    }

    protected function readRaw(): string
    {
        return (string) Setting::get(self::KEY, '0');
    }

    public static function ratingEnabled(): bool
    {
        return app(self::class)->enabled();
    }

    public static function setRatingEnabled(bool $enabled, ?User $actor = null): bool
    {
        return app(self::class)->update($enabled, $actor);
    }
}
