<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResponseAttachment extends Model
{
    protected $fillable = [
        'ticket_response_id',
        'path',
        'share_token',
        'original_name',
        'mime_type',
        'size',
    ];

    public function getShareToken(): string
    {
        if (! $this->share_token) {
            $this->share_token = \Illuminate\Support\Str::random(40);
            $this->save();
        }
        return $this->share_token;
    }

    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    public function response(): BelongsTo
    {
        return $this->belongsTo(TicketResponse::class, 'ticket_response_id');
    }
}
