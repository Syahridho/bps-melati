<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    /**
     * Ambil nilai setting berdasarkan key (dengan Redis cache).
     */
    public static function get(string $key, ?string $default = null): ?string
    {
        return Cache::remember("setting:{$key}", now()->addDays(30), function () use ($key, $default) {
            $setting = static::where('key', $key)->first();

            return $setting ? $setting->value : $default;
        });
    }

    /**
     * Simpan atau perbarui nilai setting (dan update Redis cache).
     */
    public static function set(string $key, ?string $value): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );

        if ($value !== null) {
            Cache::put("setting:{$key}", $value, now()->addDays(30));
        } else {
            Cache::forget("setting:{$key}");
        }
    }
}
