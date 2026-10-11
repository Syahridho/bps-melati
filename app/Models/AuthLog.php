<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Audit log aksi autentikasi.
 *
 * Catatan skema: kolom `meta` (JSON) ditambahkan lewat migration
 * `2026_10_13_000001_add_meta_to_auth_logs_table`, bukan migration awal.
 * Lihat App\Support\AuthLogger untuk penjelasan kronologinya.
 */
class AuthLog extends Model
{
    protected $fillable = [
        'user_id',
        'event',
        'email_hash',
        'email_masked',
        'ip_address',
        'user_agent',
        'context',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForEvent(Builder $query, string $event): Builder
    {
        return $query->where('event', $event);
    }
}
