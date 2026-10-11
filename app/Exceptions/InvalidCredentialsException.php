<?php

namespace App\Exceptions;

use Exception;

/**
 * Login ditolak karena kredensial tidak cocok — email tidak terdaftar ATAU
 * password salah. Pesannya sengaja sama untuk keduanya (anti user enumeration).
 */
class InvalidCredentialsException extends Exception
{
    public function __construct()
    {
        parent::__construct(__('auth.failed'));
    }
}
