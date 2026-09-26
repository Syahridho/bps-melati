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
