<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Batas percobaan per email + IP.
     */
    public const MAX_ATTEMPTS = 5;

    /**
     * Batas percobaan per IP saja (lebih longgar) sebagai lapisan kedua.
     */
    public const MAX_ATTEMPTS_PER_IP = 20;

    /**
     * Lamanya jendela rate limit.
     */
    private const DECAY_SECONDS = 60;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'email' => 'email',
            'password' => 'password',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required' => __('auth.email_required'),
            'email.email' => __('auth.email_invalid'),
            'password.required' => __('auth.password_required'),
        ];
    }

    /**
     * Pastikan request ini belum melewati batas percobaan login.
     *
     * Dua lapis: per (email + IP) lalu per IP. Yangmana pun yang terlampaui
     * akan memicu event Lockout dan pesan Bahasa Indonesia berisi sisa detik.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        $this->ensureIsNotRateLimitedByKey($this->throttleKey(), self::MAX_ATTEMPTS);
        $this->ensureIsNotRateLimitedByKey($this->ipThrottleKey(), self::MAX_ATTEMPTS_PER_IP);
    }

    /**
     * @throws ValidationException
     */
    private function ensureIsNotRateLimitedByKey(string $key, int $maxAttempts): void
    {
        if (! RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($key);

        // Sisa detik ikut disimpan agar frontend bisa menampilkan hitung mundur.
        $this->session()->put('throttle_seconds', $seconds);

        throw ValidationException::withMessages([
            'email' => __('auth.throttle', ['seconds' => $seconds, 'minutes' => (int) ceil($seconds / 60)]),
        ])->status(429);
    }

    /**
     * Catat satu percobaan gagal untuk kedua kunci rate limit.
     */
    public function recordFailedAttempt(): void
    {
        RateLimiter::hit($this->throttleKey(), self::DECAY_SECONDS);
        RateLimiter::hit($this->ipThrottleKey(), self::DECAY_SECONDS);
    }

    /**
     * Bersihkan limiter setelah login berhasil.
     */
    public function clearRateLimit(): void
    {
        RateLimiter::clear($this->throttleKey());
        RateLimiter::clear($this->ipThrottleKey());
    }

    /**
     * Kunci rate limit berbasis email (dinormalisasi) + IP.
     */
    public function throttleKey(): string
    {
        return Str::transliterate('login|'.Str::lower((string) $this->input('email')).'|'.$this->ip());
    }

    /**
     * Kunci rate limit berbasis IP saja.
     */
    public function ipThrottleKey(): string
    {
        return 'login-ip|'.$this->ip();
    }
}
