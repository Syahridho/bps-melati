export type TicketClassification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
export type TicketStatus = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';

export interface TicketAttachmentItem {
    id: number;
    original_name: string;
    mime_type: string;
    size: number;
    url: string;
}

export interface TicketResponseEntry {
    id: number;
    type: string;
    message: string;
    user_name: string;
    is_reporter?: boolean;
    is_system?: boolean;
    sent_at: string | null;
    created_at?: string;
    email_status?: 'pending' | 'sent' | 'failed' | 'bounced' | 'skipped' | null;
    email_sent_at?: string | null;
    email_failed_at?: string | null;
    email_error?: string | null;
    attachments: TicketAttachmentItem[];
}

export interface TicketDetailData {
    id: number;
    ticket_number: string;
    period?: string;
    sequence?: number;
    classification: TicketClassification;
    title?: string | null;
    service_type?: string | null;
    satuan_tugas?: string | null;
    reporter_name?: string | null;
    reporter_email?: string | null;
    reporter_wa?: string | null;
    content?: string | null;
    status: TicketStatus;
    version?: number;
    is_read?: boolean;
    source_app?: string;
    channel?: string;
    created_by_name?: string | null;
    completed_at?: string | null;
    closed_reason?: string | null;
    is_pengawasan?: boolean;
    pengawasan_at?: string | null;
    pengawasan_by_name?: string | null;
    is_flagged?: boolean;
    flagged_at?: string | null;
    flagged_by_name?: string | null;
    flag_note?: string | null;
    kadar_pengawasan_days?: number;
    classification_default_days?: number;
    auto_close_at?: string | null;
    created_at: string;
    updated_at?: string;
    attachments: TicketAttachmentItem[];
    responses: TicketResponseEntry[];
}
