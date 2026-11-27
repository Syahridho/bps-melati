export type Severity = 'info' | 'notice' | 'warning';
export type Tingkat = 'tinggi' | 'sedang' | 'rendah';
export type TabKey = 'logs' | 'flags' | 'summary';

export interface AuditLog {
    id: number;
    event_type: string;
    category: string;
    severity: Severity;
    actor_name: string | null;
    actor_role: string | null;
    ticket_number: string | null;
    ip: string | null;
    created_at: string;
}

export interface AuditFlag {
    id: number;
    type: string;
    severity: Severity;
    status: 'baru' | 'ditinjau' | 'wajar' | 'tindak_lanjut';
    ticket_id?: number | null;
    ticket_number?: string | null;
    review_note?: string | null;
    details: {
        tingkat?: Tingkat;
        petugas_nama?: string;
        reporter_ip?: string;
        pic_ip?: string;
        selisih_detik?: number;
        response_id?: number;
        reply_at?: string;
        action_at?: string;
        rated_at?: string | null;
        threshold_seconds?: number;
        same_ip?: boolean;
        catatan?: string;
    };
    created_at: string;
}

export interface ReviewGroup {
    key: string;
    ticket_id: number | null;
    ticket_number: string | null;
    flags: AuditFlag[];
    types: string[];
    tingkat: Tingkat;
    severity: Severity;
    representative: AuditFlag;
    created_at: string;
}
