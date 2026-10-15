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
        'is_system',
        'message',
        'idempotency_key',
        'sent_at',
        'email_sent_at',
        'email_status',
        'email_failed_at',
        'email_error',
        'email_bounced_at',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'sent_at' => 'datetime',
            'email_sent_at' => 'datetime',
            'email_failed_at' => 'datetime',
            'email_bounced_at' => 'datetime',
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

    protected static function booted(): void
    {
        // Setiap balasan petugas menggeser titik awal hitungan auto close.
        // Dipusatkan di model agar semua jalur (web, API, Input Data, Import)
        // konsisten tanpa perlu menambahkannya di tiap service.
        static::created(function (self $response): void {
            if ($response->user_id === null || $response->is_system) {
                return;
            }

            Ticket::query()
                ->whereKey($response->ticket_id)
                ->update([
                    'last_staff_response_at' => $response->sent_at ?? $response->created_at ?? now(),
                ]);
        });
    }
}
