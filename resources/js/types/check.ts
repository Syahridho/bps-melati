import { type SharedData } from '@/types';

export type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
export type Status = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';

export interface Attachment {
    id: number;
    original_name: string;
    mime_type: string;
    size: number;
    url: string;
}

export interface TicketResponse {
    id: number;
    type: 'respon_awal' | 'respon_substantif' | 'balasan_pelapor';
    message: string;
    user_name: string;
    is_reporter?: boolean;
    is_system?: boolean;
    sent_at: string | null;
    created_at: string;
    attachments: Attachment[];
}

export interface TicketDetail {
    id: number;
    ticket_number: string;
    classification: Classification;
    title?: string | null;
    service_type: string | null;
    satuan_tugas: string | null;
    reporter_name: string | null;
    content: string;
    status: Status;
    channel: string;
    created_at: string;
    completed_at: string | null;
    closed_reason: 'reporter' | 'staff' | 'auto_close' | null;
    auto_close_at: string | null;
    attachments: Attachment[];
    responses: TicketResponse[];
}

export interface CheckPageProps extends SharedData {
    ticketNumber: string;
    ticket: TicketDetail | null;
    searched: boolean;
    flash?: {
        success?: string;
    };
    errors?: Record<string, string>;
}
