<?php

namespace App\Exceptions;

use Exception;

/**
 * Login ditolak karena akun berstatus nonaktif (`users.is_active = false`).
 * Hanya dilempar setelah kredensial terverifikasi.
 */
class AccountDisabledException extends Exception
{
    public function __construct()
    {
        parent::__construct(__('auth.account_disabled'));
    }
}
