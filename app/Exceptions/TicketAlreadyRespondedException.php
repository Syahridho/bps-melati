<?php

namespace App\Exceptions;

use App\Models\TicketResponse;
use Exception;

/**
 * Dilempar saat tiket sudah punya Respon Awal dan operator lain mengirim
 * Respon Awal kedua pada waktu hampir bersamaan. Mapping ke HTTP 409.
 */
class TicketAlreadyRespondedException extends Exception
{
    public function __construct(
        public readonly TicketResponse $existingResponse,
        public readonly ?string $respondedBy = null,
        public readonly ?string $respondedAt = null,
    ) {
        parent::__construct('Tiket ini sudah mendapat Respon Awal.');
    }

    public static function for(TicketResponse $existingResponse, ?string $respondedBy, ?string $respondedAt): self
    {
        return new self($existingResponse, $respondedBy, $respondedAt);
    }
}
