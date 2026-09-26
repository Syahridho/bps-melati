<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResponseAttachment extends Model
{
    protected $fillable = [
        'ticket_response_id',
        'path',
        'original_name',
        'mime_type',
        'size',
    ];

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
