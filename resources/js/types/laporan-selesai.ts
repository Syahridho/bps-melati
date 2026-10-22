import { type PaginatedData } from '@/components/pagination';
import { type SharedData } from '@/types';

export type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
export type Status = 'respon_awal' | 'respon_substantif' | 'selesai';
export type FilterTab = 'semua' | 'pengaduan' | 'aspirasi' | 'permintaan';
export type ClosedReason = 'reporter' | 'staff' | 'auto_close';

export interface Attachment {
    id: number;
    original_name: string;
    mime_type: string;
    size: number;
    url: string;
}

export interface TicketResponseItem {
    id: number;
    type: 'respon_awal' | 'respon_substantif';
    message: string;
    user_name: string;
    sent_at: string | null;
    created_at: string;
    attachments: Attachment[];
}

export interface TicketItem {
    id: number;
    ticket_number: string;
    classification: Classification;
    title?: string | null;
    reporter_name: string | null;
    reporter_email: string | null;
    reporter_wa: string | null;
    content: string;
    status: Status;
    source_app: string;
    channel: string;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface LaporanSelesaiProps extends SharedData {
    tickets: PaginatedData<TicketItem>;
    filters: {
        search: string;
        filter: FilterTab;
        per_page: number;
        from: string | null;
        to: string | null;
    };
    counts: {
        semua: number;
        pengaduan: number;
        aspirasi: number;
        permintaan: number;
    };
}

export interface ShowProps extends SharedData {
    ticket: TicketItem & {
        period: string;
        sequence: number;
        service_type: string | null;
        satuan_tugas: string | null;
        version: number;
        is_read: boolean;
        created_by_name: string | null;
        closed_reason: ClosedReason | null;
        auto_close_at: string | null;
        attachments: Attachment[];
        responses: TicketResponseItem[];
    };
}
