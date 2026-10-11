<?php

namespace App\Actions;

use App\Models\TicketResponse;

/**
 * Hasil penyimpanan balasan.
 *
 * `replayed` = true berarti baris ini sudah ada sebelumnya (permintaan kembar
 * dengan idempotency key yang sama). Efek samping seperti broadcast dan
 * notifikasi TIDAK boleh diulang pada kasus ini.
 */
final readonly class ReplyResult
{
    public function __construct(
        public TicketResponse $response,
        public bool $replayed = false,
    ) {}
}
