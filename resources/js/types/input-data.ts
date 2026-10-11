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
