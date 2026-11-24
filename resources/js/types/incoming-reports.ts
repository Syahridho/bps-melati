import { type PaginatedData } from '@/components/molecules/pagination';
import { type SharedData } from '@/types';

export type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
export type Status = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';
export type ResponseType = 'respon_awal' | 'respon_substantif' | 'balasan_pelapor';
export type RealtimeStatus = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';
export type ClosedReason = 'reporter' | 'staff' | 'auto_close';
export type FilterTab =
    | 'semua'
    | 'belum_dibaca'
    | 'pengaduan'
    | 'aspirasi'
    | 'permintaan'
    | 'respon_awal'
    | 'respon_substantif'
    | 'berkadar_pengawasan'
    | 'ditandai'
    | 'tanpa_pic';

export interface Attachment {
    id: number;
    original_name: string;
    mime_type: string;
    size: number;
    url: string;
}

export interface TicketResponseItem {
    id: number;
    type: ResponseType | string;
    message: string;
    message_original?: string | null;
    user_name: string;
    is_reporter?: boolean;
    is_system?: boolean;
    sent_at: string | null;
    created_at?: string;
    email_status?: 'pending' | 'sent' | 'failed' | 'bounced' | 'skipped' | null;
    email_sent_at?: string | null;
    email_failed_at?: string | null;
    email_error?: string | null;
    attachments: Attachment[];
    has_profanity?: boolean;
}

/** Anggota presence channel (routes/channels.php -> ticket.{id}). */
export interface PresenceMember {
    id: number;
    name: string;
    role: 'admin' | 'operator' | 'operator_tim';
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
    completed_at?: string | null;
    rating?: number | null;
    rating_comment?: string | null;
    rated_at?: string | null;
    response?: TicketResponseItem;
}

/**
 * Payload `.ticket.response.created` (App\Events\TicketResponseCreated).
 */
export interface TicketResponseCreatedEvent extends Omit<TicketUpdatedEvent, 'response'> {
    response: TicketResponseItem & { user_role?: 'admin' | 'operator' };
}

/** Bentuk gabungan yang diterima listener di presence channel. */
export type TicketBroadcastEvent = TicketResponseCreatedEvent | TicketUpdatedEvent;

/**
 * Payload `.ticket.reply.from.reporter` (App\Events\TicketReplyFromReporter).
 *
 * Dikirim ke kanal privat per pengguna, bukan presence channel tiket, agar
 * toast muncul di halaman dashboard mana pun.
 */
export interface ReporterReplyEvent {
    ticket_id: number;
    ticket_number: string;
    reply_id: number;
    reporter_name: string;
    excerpt: string;
    has_attachment: boolean;
    created_at: string;
    is_input_data: boolean;
    url: string;
}

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

/** Payload `.inbox.changed` (App\Events\InboxChanged). */
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

export interface InboxTicketItem {
    id: number;
    ticket_number: string;
    classification: Classification;
    title?: string | null;
    reporter_name: string | null;
    reporter_email: string | null;
    reporter_wa: string | null;
    content: string;
    status: Status;
    is_pengawasan?: boolean;
    is_flagged?: boolean;
    flagged_at?: string | null;
    flagged_by_name?: string | null;
    flag_note?: string | null;
    flag_note_original?: string | null;
    version: number;
    is_read: boolean;
    source_app: string;
    channel: string;
    created_at: string;
    last_responded_by: string | null;
    assigned_to?: number | null;
    assigned_to_name?: string | null;
    assignment_mode?: 'free' | 'claim' | 'round_robin';
    title_original?: string | null;
    content_original?: string | null;
    has_profanity?: boolean;
}

export interface IncomingReportsProps extends SharedData {
    tickets: PaginatedData<InboxTicketItem>;
    filters: {
        search: string;
        filter: FilterTab;
        per_page: number;
        from: string | null;
        to: string | null;
    };
    counts: {
        semua: number;
        belum_dibaca: number;
        pengaduan: number;
        aspirasi: number;
        permintaan: number;
        respon_awal: number;
        respon_substantif: number;
        berkadar_pengawasan: number;
        ditandai: number;
        tanpa_pic: number;
    };
    inbox_open_count: number;
    activeAssignmentMode: 'free' | 'claim' | 'round_robin';
}

export interface TicketDetail {
    id: number;
    ticket_number: string;
    period: string;
    sequence: number;
    classification: Classification;
    title?: string | null;
    service_type: string | null;
    satuan_tugas: string | null;
    reporter_name: string | null;
    reporter_email: string | null;
    reporter_wa: string | null;
    content: string;
    status: Status;
    version: number;
    is_read: boolean;
    source_app: string;
    channel: string;
    created_by_name: string | null;
    assigned_to?: number | null;
    assigned_to_name?: string | null;
    assigned_at?: string | null;
    assignment_mode?: 'free' | 'claim' | 'round_robin';
    is_orphaned?: boolean;
    completed_at: string | null;
    closed_reason: ClosedReason | null;
    rating?: number | null;
    rating_comment?: string | null;
    rating_comment_original?: string | null;
    rated_at?: string | null;
    is_pengawasan?: boolean;
    pengawasan_at?: string | null;
    pengawasan_by_name?: string | null;
    is_flagged?: boolean;
    flagged_at?: string | null;
    flagged_by_name?: string | null;
    flag_note?: string | null;
    flag_note_original?: string | null;
    kadar_pengawasan_days?: number;
    classification_default_days?: number;
    auto_close_at: string | null;
    created_at: string;
    updated_at: string;
    title_original?: string | null;
    content_original?: string | null;
    has_profanity?: boolean;
    has_any_profanity?: boolean;
    attachments: Attachment[];
    responses: TicketResponseItem[];
}

export interface AssignmentLogItem {
    id: number;
    action: string;
    action_label: string;
    from_user_name: string | null;
    to_user_name: string | null;
    performed_by_name: string | null;
    note: string | null;
    created_at: string | null;
}

export interface AssignableOperator {
    id: number;
    name: string;
}

export interface ShowProps extends SharedData {
    ticket: TicketDetail;
    can?: {
        edit: boolean;
        delete: boolean;
        reply?: boolean;
        claim?: boolean;
        reassign?: boolean;
        view_assignment_history?: boolean;
    };
    assignableOperators?: AssignableOperator[];
    assignmentLogs?: AssignmentLogItem[];
    activeAssignmentMode?: 'free' | 'claim' | 'round_robin';
    from?: 'input-data' | 'incoming-reports' | 'my-reports';
    flash: {
        success?: string;
        error?: string;
        conflict?: ReplyConflict;
    };
}
