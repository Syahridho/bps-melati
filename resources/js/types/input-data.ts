export type ClassificationType = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
export type StatusType = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';
export type FilterTab = 'semua' | 'pengaduan' | 'aspirasi' | 'permintaan';
export type ResponseType = 'respon_awal' | 'respon_substantif';

export interface TicketItem {
    id: number;
    ticket_number: string;
    classification: ClassificationType;
    title?: string | null;
    service_type: string | null;
    satuan_tugas: string | null;
    reporter_name: string | null;
    reporter_email: string | null;
    reporter_wa: string | null;
    content: string;
    status: StatusType;
    is_read?: boolean;
    source_app: string;
    channel: string;
    created_at: string;
}

export interface ChannelChild {
    id: number;
    name: string;
}

export interface ChannelGroup {
    id: number;
    name: string;
    children: ChannelChild[];
}

/**
 * Bentuk data form "Tambah Data Baru" (App\StoreTicketRequest).
 * Dipakai bersama oleh add-ticket-dialog dan form block-nya agar tidak ada `any`.
 */
export interface AddTicketFormData {
    classification: ClassificationType | '';
    channel_id: string;
    reporter_name: string;
    reporter_email: string;
    reporter_wa: string;
    title: string;
    content: string;
    service_type: string;
    tanggal_kejadian: string;
    satuan_tugas: string;
    response_type: ResponseType;
    response_message: string;
    attachments: File[];
    response_attachments: File[];
}

export type SetTicketFormField = <K extends keyof AddTicketFormData>(field: K, value: AddTicketFormData[K]) => void;

export interface InputDataAttachment {
    id: number;
    original_name: string;
    mime_type: string;
    size: number;
    url: string;
}

export interface InputDataResponseItem {
    id: number;
    type: ResponseType | string;
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
    attachments: InputDataAttachment[];
}

export interface InputDataTicketDetail {
    id: number;
    ticket_number: string;
    period: string;
    sequence: number;
    classification: ClassificationType;
    title?: string | null;
    service_type: string | null;
    satuan_tugas: string | null;
    reporter_name: string | null;
    reporter_email: string | null;
    reporter_wa: string | null;
    content: string;
    status: StatusType;
    version: number;
    is_read: boolean;
    source_app: string;
    channel: string;
    created_by_name: string | null;
    completed_at: string | null;
    closed_reason: 'reporter' | 'staff' | 'auto_close' | null;
    is_pengawasan?: boolean;
    pengawasan_at?: string | null;
    pengawasan_by_name?: string | null;
    is_flagged?: boolean;
    flagged_at?: string | null;
    flagged_by_name?: string | null;
    flag_note?: string | null;
    kadar_pengawasan_days?: number;
    classification_default_days?: number;
    auto_close_at: string | null;
    created_at: string;
    updated_at: string;
    attachments: InputDataAttachment[];
    responses: InputDataResponseItem[];
}

export interface InputDataReplyConflict {
    code: 'already_responded' | 'already_completed';
    message: string;
    responded_by?: string | null;
    responded_at?: string | null;
}

export interface InputDataShowProps {
    [key: string]: unknown;
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
            role: 'admin' | 'operator' | 'operator_tim';
            avatar?: string;
        };
    };
    ticket: InputDataTicketDetail;
    can?: {
        edit: boolean;
        delete: boolean;
    };
    from?: string;
    flash: {
        success?: string;
        conflict?: InputDataReplyConflict;
    };
}
