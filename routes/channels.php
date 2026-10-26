<?php

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/**
 * Kanal privat per pengguna. Dipakai antara lain oleh notifikasi
 * `.ticket.reply.from.reporter` (toast "Balasan baru dari pelapor") dan
 * `.session.terminated` / `.login.attempt.blocked`.
 *
 * Hanya pemilik id yang boleh berlangganan dan akunnya harus masih aktif —
 * scoping role/tiket dihitung di server saat event disiarkan
 * (lihat App\Events\TicketReplyFromReporter::broadcastOn()).
 */
Broadcast::channel('App.Models.User.{id}', function (User $user, int $id) {
    return (int) $user->id === (int) $id && $user->is_active === true;
});

/**
 * Kanal privat per pengguna: hanya akun tersebut yang boleh berlangganan.
 * Dipakai SessionTerminated dan LoginAttemptBlocked.
 */
Broadcast::channel('user.{userId}', function (User $user, int $userId) {
    if ((int) $user->id !== $userId) {
        return false;
    }

    // Akun nonaktif tidak boleh punya sesi aktif sama sekali.
    return $user->is_active === true;
});

/**
 * Presence channel detail tiket — dipakai halaman Laporan Masuk / Input Data.
 * Hanya admin & operator aktif yang boleh masuk. Return array (bukan true)
 * karena presence channel butuh data anggota untuk `.here()` di frontend.
 */
Broadcast::channel('ticket.{ticketId}', function (User $user, int $ticketId) {
    if (! ($user->isAdmin() || $user->isOperator())) {
        return false;
    }

    if (! Ticket::whereKey($ticketId)->exists()) {
        return false;
    }

    return [
        'id' => $user->id,
        'name' => $user->name,
        'role' => $user->role->value,
    ];
});

/**
 * Private channel untuk halaman daftar. Scope dibatasi agar tidak ada kanal
 * liar yang bisa dik subscribing dari sisi klien.
 */
Broadcast::channel('inbox.{scope}', function (User $user, string $scope) {
    if (! in_array($scope, ['laporan-masuk'], true)) {
        return false;
    }

    return $user->isAdmin() || $user->isOperator();
});
