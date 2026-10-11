import { REKAP_MATRIX_COLUMNS } from '@/lib/rekap-constants';
import { type RekapMatrixColumnKey, type RekapPeriodCounts } from '@/types/rekap';

/**
 * Halaman rekap tersedia untuk dua role dengan prefix route berbeda
 * (`dashboard.admin.*` dan `dashboard.operator.*`). Prefix dibaca dari
 * pathname supaya ketiga halaman rekap memakai sumber kebenaran yang sama.
 */
export function resolveRekapRolePrefix(): string {
    if (typeof window === 'undefined') {
        return 'dashboard.admin.';
    }

    return window.location.pathname.startsWith('/dashboard/operator') ? 'dashboard.operator.' : 'dashboard.admin.';
}

/** Ambil nilai kolom klasifikasi untuk sebuah periode, default 0 kalau belum ada data. */
export function countFor(perPeriod: Record<string, RekapPeriodCounts> | undefined, periodKey: string, column: RekapMatrixColumnKey): number {
    return perPeriod?.[periodKey]?.[column] ?? 0;
}

/** Jumlah PST + Lain + Asp + Inf dari angka satu bulan (mode ringkas). */
export function sumCounts(counts: RekapPeriodCounts | undefined): number {
    return REKAP_MATRIX_COLUMNS.reduce((total, column) => total + (counts?.[column] ?? 0), 0);
}

/**
 * Jumlah PST + Lain + Asp + Inf untuk sebuah periode pada matriks baris
 * (mode ringkas). Cermin dari `RekapReport::sumColumns()` di backend agar
 * tabel web, hasil cetak, dan Excel selalu sama.
 */
export function sumMonthCell(perPeriod: Record<string, RekapPeriodCounts> | undefined, periodKey: string): number {
    return sumCounts(perPeriod?.[periodKey]);
}
