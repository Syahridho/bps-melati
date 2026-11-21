<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketAssignmentLog extends Model
{
    public const ACTION_CLAIMED = 'claimed';

    public const ACTION_AUTO_ASSIGNED = 'auto_assigned';

    public const ACTION_REASSIGNED = 'reassigned';

    public const ACTION_RELEASED = 'released';

    protected $fillable = [
        'ticket_id',
        'from_user_id',
        'to_user_id',
        'action',
        'performed_by',
        'note',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id')->withTrashed();
    }

    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id')->withTrashed();
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by')->withTrashed();
    }

    public function actionLabel(): string
    {
        return match ($this->action) {
            self::ACTION_CLAIMED => 'Diambil operator',
            self::ACTION_AUTO_ASSIGNED => 'Ditugaskan otomatis',
            self::ACTION_REASSIGNED => 'PIC diubah',
            self::ACTION_RELEASED => 'PIC dilepas',
            default => $this->action,
        };
    }
}
