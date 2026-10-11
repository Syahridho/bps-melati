<?php

namespace App\Exceptions;

use Exception;

/**
 * Dilempar saat tiket sudah berstatus 'selesai' sehingga tidak bisa dibalas lagi.
 * Mapping ke HTTP 409.
 */
class TicketAlreadyCompletedException extends Exception
{
    public function __construct(string $message = 'Tiket telah selesai dan tidak dapat dibalas.')
    {
        parent::__construct($message);
    }
}
