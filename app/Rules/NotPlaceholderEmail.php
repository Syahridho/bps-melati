<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Menolak alamat email dengan local-part atau domain yang jelas palsu/placeholder.
 * Daftar dikonfigurasi di config/email_validation.php.
 */
class NotPlaceholderEmail implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! str_contains($value, '@')) {
            return; // biarkan rule 'email' yang menangani format
        }

        [$localPart, $domain] = explode('@', strtolower($value), 2);

        $blockedLocalParts = config('email_validation.blocked_local_parts', []);
        $blockedDomains = config('email_validation.blocked_domains', []);

        if (in_array($localPart, $blockedLocalParts, true)) {
            $fail('Alamat email tampaknya tidak valid. Periksa kembali penulisannya.');

            return;
        }

        if (in_array($domain, $blockedDomains, true)) {
            $fail('Alamat email tampaknya tidak valid. Periksa kembali penulisannya.');
        }
    }
}
