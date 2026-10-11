<?php

namespace App\Support;

use Closure;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Menjalankan broadcast tanpa membiarkan kegagalan broadcaster menggagalkan
 * request yang datanya sudah tersimpan.
 *
 * Semua event tiket dikirim inline (ShouldBroadcastNow) supaya tidak bergantung
 * pada worker antrean `broadcasts`. Konsekuensinya, kegagalan Reverb/Redis akan
 * naik ke HTTP; pemanggil harus tetap mengembalikan hasil sukses ke pengguna dan
 * cukup mencatat kesalahannya.
 */
class SafeBroadcast
{
    /**
     * @param  array<string, mixed>  $context
     */
    public static function send(string $event, Closure $dispatch, array $context = []): void
    {
        try {
            $dispatch();
        } catch (Throwable $e) {
            Log::error('Broadcast '.$event.' gagal, perubahan tetap tersimpan: '.$e->getMessage(), [
                'event' => $event,
                ...$context,
            ]);
        }
    }
}
