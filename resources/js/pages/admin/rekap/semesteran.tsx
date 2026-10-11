import { RekapPeriodFilter } from '@/components/rekap-period-filter';
import { RekapPeriodMatrixTable } from '@/components/rekap-period-matrix-table';
import { RekapPrintActions } from '@/components/rekap-print-actions';
import { useRekapFilters } from '@/hooks/use-rekap-filters';
import AdminPage from '@/pages/admin/page';
import { type PeriodOption, type RekapMatrixPeriodColumn, type RekapMatrixRow, type RekapMatrixTotals } from '@/types/rekap';

interface RekapSemesteranProps {
    rows: RekapMatrixRow[];
    totals: RekapMatrixTotals;
    months: RekapMatrixPeriodColumn[];
    semester: string;
    semesterLabel: string;
    semesters: PeriodOption[];
}

const PRINT_FRAME_ID = 'rekap-semesteran-print-frame';

export default function RekapSemesteran({ rows, totals, months, semester, semesterLabel, semesters }: RekapSemesteranProps) {
    const { rolePrefix, printUrl, excelUrl, exportOpen, setExportOpen, handlePeriodChange, handlePrint } = useRekapFilters({
        routeKey: 'rekap-semesteran',
        periodParam: 'semester',
        period: semester,
        frameId: PRINT_FRAME_ID,
    });

    return (
        <AdminPage
            title="Rekap Semesteran"
            description="Rekapitulasi laporan per semester (6 bulan)"
            breadcrumbs={[
                { title: 'Rekap', href: route(`${rolePrefix}rekap-semesteran.index`) },
                { title: 'Semesteran', href: route(`${rolePrefix}rekap-semesteran.index`) },
            ]}
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <RekapPeriodFilter
                        value={semester}
                        periods={semesters}
                        onValueChange={handlePeriodChange}
                        placeholder="Pilih semester"
                        triggerClassName="w-[280px]"
                    />

                    <RekapPrintActions
                        excelUrl={excelUrl}
                        printUrl={printUrl}
                        exportOpen={exportOpen}
                        onExportOpenChange={setExportOpen}
                        onPrint={handlePrint}
                        dialogTitle={`Export PDF — Rekap Semesteran ${semesterLabel}`}
                        frameTitle={`Pratinjau rekap ${semesterLabel}`}
                        frameId={PRINT_FRAME_ID}
                        dialogContentClassName="max-w-6xl"
                        dialogDescription="Pratinjau di bawah adalah dokumen berorientasi landscape lengkap dengan kop surat. Gunakan tombol Cetak lalu pilih “Save as PDF” pada dialog printer untuk menyimpan berkas."
                    />
                </div>

                <RekapPeriodMatrixTable rows={rows} totals={totals} periods={months} />

                <p className="text-muted-foreground text-xs">
                    PST = Pengaduan Layanan PST, Lain = Pengaduan Layanan Lainnya, Asp = Aspirasi, Inf = Permintaan Informasi. Baris kanal induk
                    berwarna abu-abu karena tidak dapat dipilih saat input data.
                </p>
            </div>
        </AdminPage>
    );
}
