import { RekapFixedMatrixTable } from '@/components/rekap-fixed-matrix-table';
import { RekapPeriodMatrixTable } from '@/components/rekap-period-matrix-table';
import { REKAP_VIEW_MODE_RINGKAS } from '@/lib/rekap-constants';
import { type RekapMatrixPeriodColumn, type RekapMatrixRow, type RekapMatrixTotals } from '@/types/rekap';

interface RekapSummaryTableProps {
    rows: RekapMatrixRow[];
    totals: RekapMatrixTotals;
    periods: RekapMatrixPeriodColumn[];
    /**
     * Gaya tabel yang dipakai, mengikuti tabel detail pada halaman terkait:
     * `period` (shadcn Table, dipakai semesteran) atau `fixed` (tabel
     * `table-fixed` + `colgroup`, dipakai tahunan).
     */
    variant: 'period' | 'fixed';
}

/**
 * Tabel rekap mode ringkas: tiap bulan satu kolom berisi jumlah PST + Lain +
 * Asp + Inf, kolom Jumlah tetap di kanan. Data yang dipakai sama persis dengan
 * tabel detail, penjumlahannya terjadi di `sumMonthCell()`.
 */
export function RekapSummaryTable({ rows, totals, periods, variant }: RekapSummaryTableProps) {
    if (variant === 'period') {
        return <RekapPeriodMatrixTable rows={rows} totals={totals} periods={periods} viewMode={REKAP_VIEW_MODE_RINGKAS} />;
    }

    return <RekapFixedMatrixTable rows={rows} totals={totals} periods={periods} viewMode={REKAP_VIEW_MODE_RINGKAS} />;
}
