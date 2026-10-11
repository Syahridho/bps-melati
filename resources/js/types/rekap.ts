export interface RekapRow {
    channel: string;
    isParent: boolean;
    pengaduan_pst: number;
    pengaduan_lainnya: number;
    aspirasi: number;
    permintaan_informasi: number;
    jumlah: number;
    children: RekapRow[];
}

export type RekapTotals = Omit<RekapRow, 'channel' | 'isParent' | 'children'>;

export type RekapColumnKey = keyof RekapTotals;

export interface RekapTableColumn {
    key: RekapColumnKey;
    label: string;
}

export interface PeriodOption {
    value: string;
    label: string;
}

/** Urutan kolom klasifikasi harus sama dengan RekapReport::COLUMNS di backend. */
export type RekapMatrixColumnKey = 'pengaduan_pst' | 'pengaduan_lainnya' | 'aspirasi' | 'permintaan_informasi';

/** Jumlah per kolom klasifikasi untuk satu periode (bulan/semester/tahun). */
export type RekapPeriodCounts = Record<RekapMatrixColumnKey, number>;

export interface RekapMatrixRow {
    channel: string;
    /** period key -> breakdown 4 kolom klasifikasi */
    perPeriod: Record<string, RekapPeriodCounts>;
    jumlah: number;
    children: RekapMatrixRow[];
}

export interface RekapMatrixTotals {
    jumlah: number;
    /** period key -> breakdown 4 kolom klasifikasi */
    [period: string]: RekapPeriodCounts | number;
}

export interface RekapMatrixPeriodColumn {
    key: string;
    label: string;
}
