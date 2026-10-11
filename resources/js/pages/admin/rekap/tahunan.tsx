import { RekapFixedMatrixTable } from '@/components/rekap-fixed-matrix-table';
import { RekapPeriodFilter } from '@/components/rekap-period-filter';
import { RekapPrintActions } from '@/components/rekap-print-actions';
import { useRekapFilters } from '@/hooks/use-rekap-filters';
import AdminPage from '@/pages/admin/page';
import { type PeriodOption, type RekapMatrixPeriodColumn, type RekapMatrixRow, type RekapMatrixTotals } from '@/types/rekap';

interface RekapTahunanProps {
    rows: RekapMatrixRow[];
    totals: RekapMatrixTotals;
    months: RekapMatrixPeriodColumn[];
    year: string;
    yearLabel: string;
    years: PeriodOption[];
}

const PRINT_FRAME_ID = 'rekap-tahunan-print-frame';

export default function RekapTahunan({ rows, totals, months, year, yearLabel, years }: RekapTahunanProps) {
    const { rolePrefix, printUrl, excelUrl, exportOpen, setExportOpen, handlePeriodChange, handlePrint } = useRekapFilters({
        routeKey: 'rekap-tahunan',
        periodParam: 'year',
        period: year,
        frameId: PRINT_FRAME_ID,
    });

    return (
        <AdminPage
            title="Rekap Tahunan"
            description="Rekapitulasi laporan per tahun (12 bulan)"
            breadcrumbs={[
                { title: 'Rekap', href: route(`${rolePrefix}rekap-tahunan.index`) },
                { title: 'Tahunan', href: route(`${rolePrefix}rekap-tahunan.index`) },
            ]}
        >
            <div className="flex min-w-0 flex-col gap-4">
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <RekapPeriodFilter
                        value={year}
                        periods={years}
                        onValueChange={handlePeriodChange}
                        placeholder="Pilih tahun"
                        triggerClassName="w-[220px]"
                    />

                    <RekapPrintActions
                        excelUrl={excelUrl}
                        printUrl={printUrl}
                        exportOpen={exportOpen}
                        onExportOpenChange={setExportOpen}
                        onPrint={handlePrint}
                        dialogTitle={`Export PDF — Rekap Tahunan ${yearLabel}`}
                        frameTitle={`Pratinjau rekap ${yearLabel}`}
                        frameId={PRINT_FRAME_ID}
                        dialogContentClassName="max-w-6xl"
                        dialogDescription="Pratinjau di bawah adalah dokumen berorientasi landscape lengkap dengan kop surat. Gunakan tombol Cetak lalu pilih “Save as PDF” pada dialog printer untuk menyimpan berkas."
                    />
                </div>

                <RekapFixedMatrixTable rows={rows} totals={totals} periods={months} />

                <p className="text-muted-foreground text-xs">
                    PST = Pengaduan Layanan PST, Lain = Pengaduan Layanan Lainnya, Asp = Aspirasi, Inf = Permintaan Informasi. Baris kanal induk
                    berwarna abu-abu karena tidak dapat dipilih saat input data.
                </p>
            </div>
        </AdminPage>
    );
}
