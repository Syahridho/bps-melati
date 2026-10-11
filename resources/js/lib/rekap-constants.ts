import { type PeriodOption, type RekapMatrixColumnKey, type RekapTableColumn, type RekapViewMode } from '@/types/rekap';

/**
 * Urutan kolom klasifikasi harus sama dengan RekapReport::COLUMNS di backend.
 * Nilai sudah diakumulasikan di server (sub-kanal ikut ke kanal induk).
 */
export const REKAP_COLUMNS: RekapTableColumn[] = [
    { key: 'pengaduan_pst', label: 'Layanan PST' },
    { key: 'pengaduan_lainnya', label: 'Layanan Lainnya' },
    { key: 'aspirasi', label: 'Aspirasi' },
    { key: 'permintaan_informasi', label: 'Permintaan Informasi' },
    { key: 'jumlah', label: 'Jumlah' },
];

/** Urutan kolom untuk tabel matriks periode (semesteran/tahunan). */
export const REKAP_MATRIX_COLUMNS: RekapMatrixColumnKey[] = ['pengaduan_pst', 'pengaduan_lainnya', 'aspirasi', 'permintaan_informasi'];

/** Label ringkas pada header tabel matriks periode. */
export const REKAP_MATRIX_SUB_COLUMNS = ['PST', 'Lain', 'Asp', 'Inf'];

export const REKAP_PRINT_FRAME_ID = 'rekap-print-frame';

/** Nama query param mode tampilan rekap. */
export const REKAP_VIEW_MODE_PARAM = 'tampilan';

export const REKAP_VIEW_MODE_DETAIL: RekapViewMode = 'detail';

export const REKAP_VIEW_MODE_RINGKAS: RekapViewMode = 'ringkas';

/** Mode yang dipakai bila param `tampilan` kosong atau tidak dikenal. */
export const REKAP_VIEW_MODE_DEFAULT: RekapViewMode = REKAP_VIEW_MODE_DETAIL;

/** Opsi dropdown mode tampilan. */
export const REKAP_VIEW_MODE_OPTIONS: PeriodOption[] = [
    { value: REKAP_VIEW_MODE_DETAIL, label: 'Detail' },
    { value: REKAP_VIEW_MODE_RINGKAS, label: 'Ringkas' },
];

/** Catatan kaki di bawah tabel rekap, per mode tampilan. */
export const REKAP_TABLE_NOTES: Record<RekapViewMode, string> = {
    [REKAP_VIEW_MODE_DETAIL]:
        'PST = Pengaduan Layanan PST, Lain = Pengaduan Layanan Lainnya, Asp = Aspirasi, Inf = Permintaan Informasi. Baris kanal induk berwarna abu-abu karena tidak dapat dipilih saat input data.',
    [REKAP_VIEW_MODE_RINGKAS]:
        'Angka menunjukkan jumlah PST + Lain + Asp + Inf. Baris kanal induk berwarna abu-abu karena tidak dapat dipilih saat input data.',
};
