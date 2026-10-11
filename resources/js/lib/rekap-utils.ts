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
