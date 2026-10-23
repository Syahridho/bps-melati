<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'current_session_id',
        'last_activity_at',
        'last_login_at',
        'last_login_ip',
        'last_login_agent',
    ];

    /**
     * The model's default attributes.
     *
     * @var array<string, string>
     */
    protected $attributes = [
        'role' => 'operator',
        'is_active' => true,
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'current_session_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'is_active' => 'boolean',
            'last_activity_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function authLogs(): HasMany
    {
        return $this->hasMany(AuthLog::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isOperator(): bool
    {
        return $this->role === UserRole::Operator;
    }

    public function isOperatorTim(): bool
    {
        return $this->role === UserRole::OperatorTim;
    }

    /*
    |--------------------------------------------------------------------------
    | Kebijakan Satu Sesi Aktif
    |--------------------------------------------------------------------------
    */

    /**
     * Sesi milik pengguna yang dicatat masih hidup?
     */
    public function hasActiveSession(): bool
    {
        if (blank($this->current_session_id) || $this->last_activity_at === null) {
            return false;
        }

        return $this->last_activity_at->greaterThan($this->activityCutoff());
    }

    /**
     * Sesi tercatat sudah basi sehingga boleh diganti tanpa konfirmasi.
     */
    public function hasStaleSession(): bool
    {
        if (blank($this->current_session_id)) {
            return false;
        }

        return $this->last_activity_at === null || $this->last_activity_at->lessThanOrEqualTo($this->activityCutoff());
    }

    public function isIdleBeyondTimeout(): bool
    {
        if ($this->last_activity_at === null) {
            return false;
        }

        return $this->last_activity_at->lessThanOrEqualTo(now()->subMinutes((int) config('session_policy.inactivity_timeout_minutes', 120)));
    }

    /**
     * Sesi yang tercatat masih dalam ambang "aktif".
     */
    public function isSessionActive(?string $thresholdMinutes = null): bool
    {
        if (blank($this->current_session_id) || $this->last_activity_at === null) {
            return false;
        }

        $minutes = $thresholdMinutes ?? (int) config('session_policy.active_threshold_minutes', 5);

        return $this->last_activity_at->greaterThan(now()->subMinutes($minutes));
    }

    public function activityCutoff(): Carbon
    {
        return now()->subMinutes((int) config('session_policy.active_threshold_minutes', 5));
    }

    /**
     * Tandai sesi sebagai aktif. Penulisan throttled supaya tidak menyentuh
     * database pada setiap request.
     */
    public function touchActivity(): bool
    {
        if ($this->last_activity_at !== null) {
            $throttle = (int) config('session_policy.activity_write_throttle_seconds', 60);

            if ($this->last_activity_at->greaterThan(now()->subSeconds($throttle))) {
                return false;
            }
        }

        $this->forceFill(['last_activity_at' => now()])->saveQuietly();

        return true;
    }

    /**
     * Tandai status online/offline untuk UI admin.
     */
    public function isOnline(): bool
    {
        return $this->isSessionActive();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeInactive(Builder $query): Builder
    {
        return $query->where('is_active', false);
    }
}
