<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

class AuditFlag extends Model
{
    const UPDATED_AT = null;

    public const TYPE_JARINGAN_SAMA = 'jaringan_sama';

    public const TYPE_RATING_CEPAT = 'rating_cepat';

    public const TYPE_RATING_BERUNTUN_IP = 'rating_beruntun_ip';

    public const TYPE_PERANGKAT_SAMA = 'perangkat_sama';

    public const TYPE_PENYELESAIAN_TIDAK_WAJAR = 'penyelesaian_tidak_wajar';

    public const TYPE_SELESAI_CEPAT_SETELAH_BALASAN = 'selesai_cepat_setelah_balasan';

    public const TYPE_LOGIN_GAGAL_BERULANG = 'login_gagal_berulang';

    public const TYPE_LOGIN_BARU = 'login_baru';

    public const TYPE_EKSPOR_SENSITIF = 'ekspor_sensitif';

    public const TYPE_PERUBAHAN_PENGATURAN_KRITIS = 'perubahan_pengaturan_kritis';

    public const STATUS_BARU = 'baru';

    public const STATUS_DITINJAU = 'ditinjau';

    public const STATUS_WAJAR = 'wajar';

    public const STATUS_TINDAK_LANJUT = 'tindak_lanjut';

    public const SEVERITY_INFO = 'info';

    public const SEVERITY_NOTICE = 'notice';

    public const SEVERITY_WARNING = 'warning';

    protected $fillable = [
        'type',
        'severity',
        'ticket_id',
        'related_user_id',
        'audit_log_id',
        'details',
        'status',
        'reviewed_by',
        'review_note',
        'exclude_rating',
    ];

    protected $casts = [
        'details' => 'array',
        'severity' => 'string',
        'exclude_rating' => 'boolean',
        'status' => 'string',
    ];

    public function auditLog(): BelongsTo
    {
        return $this->belongsTo(AuditLog::class, 'audit_log_id');
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class, 'ticket_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by')->withTrashed();
    }

    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    public function scopeByStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    public function scopeNewFlags(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_BARU);
    }

    public function scopeReviewedFlags(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_DITINJAU);
    }

    public function scopeBySeverity(Builder $query, string $severity): Builder
    {
        return $query->where('severity', $severity);
    }

    public const CACHE_VERSION_KEY = 'auditflags:version';

    public static function cacheVersion(): string
    {
        try {
            return (string) Cache::rememberForever(self::CACHE_VERSION_KEY, fn (): string => (string) hrtime(true));
        } catch (\Throwable $e) {
            return (string) hrtime(true);
        }
    }

    public static function invalidateCache(): void
    {
        try {
            Cache::forever(self::CACHE_VERSION_KEY, (string) hrtime(true));
        } catch (\Throwable $e) {
            // ignore
        }
    }

    protected static function booted(): void
    {
        static::saved(fn () => self::invalidateCache());
        static::deleted(fn () => self::invalidateCache());
    }
}
