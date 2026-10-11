import { type RekapMatrixColumnKey, type RekapTableColumn } from '@/types/rekap';

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
