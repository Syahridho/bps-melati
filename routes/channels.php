<?php

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
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
 * Hanya admin & operator aktif yang boleh masuk (operator_tim tidak boleh akses laporan masuk).
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

    // Operator Tim tidak boleh akses inbox laporan masuk
    if ($user->isOperatorTim()) {
        return false;
    }

    return $user->isAdmin() || $user->isOperator();
});
