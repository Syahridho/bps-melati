export type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
export type Status = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';
export type ResponseType = 'respon_awal' | 'respon_substantif' | 'balasan_pelapor';

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
    user_name: string;
    is_reporter?: boolean;
    sent_at: string | null;
    created_at?: string;
    attachments: Attachment[];
}

export { type PresenceMember } from './realtime-types';
