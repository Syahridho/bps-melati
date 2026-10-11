import { type TicketResponseItem } from '@/pages/admin/laporan-masuk/components/types';

export type RealtimeStatus = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';

/** Anggota presence channel (routes/channels.php -> ticket.{id}). */
export interface PresenceMember {
    id: number;
    name: string;
    role: 'admin' | 'operator';
}

/** Client event (whisper) "sedang mengetik balasan". */
export interface TypingSignal {
    user_id: number;
    name: string;
    at: number;
}

/** Payload `.ticket.updated` (App\Events\TicketUpdated). */
export interface TicketUpdatedEvent {
    ticket_id: number;
    ticket_number: string;
    status: RealtimeStatus;
    version: number;
    actor_id: number | null;
    response?: TicketResponseItem;
}

/**
 * Payload `.ticket.response.created` (App\Events\TicketResponseCreated).
 * Bentuknya sama dengan TicketUpdatedEvent dengan `response` yang wajib ada,
 * jadi keduanya bisa ditangani oleh satu listener.
 */
export interface TicketResponseCreatedEvent extends Omit<TicketUpdatedEvent, 'response'> {
    response: TicketResponseItem & { user_role?: 'admin' | 'operator' };
}

/** Bentuk gabungan yang diterima listener di presence channel. */
export type TicketBroadcastEvent = TicketResponseCreatedEvent | TicketUpdatedEvent;

/** Payload `.inbox.updated` (App\Events\InboxUpdated). */
export interface InboxUpdatedEvent {
    ticket_id: number;
    ticket_number: string;
    status: RealtimeStatus;
    version: number;
    is_read: boolean;
    actor_id: number | null;
    actor_name: string | null;
}

/**
 * Payload `.inbox.changed` (App\Events\InboxChanged).
 *
 * Sinyal agregat: satu tiket berubah, atau satu batch auto close. Klien tidak
 * memakai angkanya, hanya memicu partial reload yang sudah terotorisasi.
 */
export interface InboxChangedEvent {
    reason: 'created' | 'read' | 'replied' | 'status_changed' | 'completed' | 'auto_closed';
    ticket_ids: number[];
    closed_count: number;
}

/** Banner konflik yang dikirim server lewat flash saat balasan ditolak (409). */
export interface ReplyConflict {
    code: 'already_responded' | 'already_completed';
    message: string;
    responded_by?: string | null;
    responded_at?: string | null;
}
