/** Tipe generik untuk satu item di daftar tiket (shared across all list pages). */
export interface TicketListEntry {
    id: number;
    ticket_number: string;
    /** Judul atau cuplikan konten. Sudah disiapkan oleh adapter. */
    display_title: string;
    content: string;
    classification: 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
    status: 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';
    channel: string;
    created_at: string;
    reporter_name: string | null;

    /** Navigasi saat baris diklik. */
    show_href: string;

    /** Bendera / tandai. */
    is_flagged?: boolean;
    flag_note?: string | null;
    flagged_by_name?: string | null;
    /** URL PATCH untuk toggle tandai. Null = fitur tidak aktif di halaman ini. */
    tandai_route: string | null;

    /** Titik biru "belum dibaca". Null = fitur tidak dipakai di halaman ini. */
    is_read?: boolean | null;

    /** Badge "Berkadar Pengawasan". */
    is_pengawasan?: boolean;

    /**
     * Badge realtime "dibalas oleh X".
     * Hanya Laporan Masuk yang mengisinya; halaman lain biarkan null.
     */
    recently_answered_by?: string | null;
}
