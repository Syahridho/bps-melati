<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TicketCounter extends Model
{
    protected $fillable = [
        'period',
        'last_number',
    ];

    protected function casts(): array
    {
        return [
            'last_number' => 'integer',
        ];
    }
}
