<?php

namespace App\Exceptions;

use Exception;

/**
 * Login ditolak karena kredensial valid tetapi akun sedang dipakai sesi lain
 * yang masih aktif. Mapping ke HTTP 409 dengan kode `account_in_use`.
 *
 * PENTING: exception ini HANYA boleh dilempar SETELAH kredensial terverifikasi.
 * Melemparnya lebih awal akan membocorkan keberadaan akun.
 */
class AccountInUseException extends Exception
{
    /**
     * @param  array{device: string, last_active: string, last_active_iso: string|null, ip: string|null}  $context  Data aman untuk ditampilkan ke pengguna.
     */
    public function __construct(
        public readonly int $userId,
        public readonly array $context,
    ) {
        parent::__construct(__('auth.account_in_use'));
    }
}
