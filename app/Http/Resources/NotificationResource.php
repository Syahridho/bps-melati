<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource konsisten untuk respons notifikasi API.
 *
 * Format:
 * {
 *   "id": "...",
 *   "type": "laporan_masuk | laporan_selesai | laporan_dibalas | input_data",
 *   "title": "...",
 *   "message": "...",
 *   "ticket_number": "...",
 *   "url": "...",
 *   "actor_name": "...",
 *   "read_at": "2026-11-11T...|null",
 *   "created_at": "2026-11-11T..."
 * }
 */
class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->data['type'] ?? null,
            'title' => $this->data['title'] ?? null,
            'message' => $this->data['message'] ?? null,
            'ticket_number' => $this->data['ticket_number'] ?? null,
            'url' => $this->data['url'] ?? null,
            'actor_name' => $this->data['actor_name'] ?? null,
            'read_at' => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
