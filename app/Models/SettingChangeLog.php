<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SettingChangeLog extends Model
{
    protected $fillable = [
        'key',
        'old_value',
        'new_value',
        'changed_by',
        'scheduled_at',
        'applied_at',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'applied_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by')->withTrashed();
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->whereNull('applied_at')
            ->whereNull('cancelled_at');
    }

    public function scopeDue(Builder $query): Builder
    {
        return $query->whereNull('applied_at')
            ->whereNull('cancelled_at')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now());
    }
}

