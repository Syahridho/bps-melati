<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TicketResponse extends Model
{
    protected $fillable = [
        'ticket_id',
        'user_id',
        'type',
        'message',
        'idempotency_key',
        'sent_at',
        'email_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'email_sent_at' => 'datetime',
        ];
    }

    /**
     * Kunci idempotensi untuk mendeteksi request kembar (double submit / retry).
     */
    public function scopeWithIdempotencyKey($query, ?string $key)
    {
        return $key === null ? $query : $query->where('idempotency_key', $key);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ResponseAttachment::class);
    }
}
