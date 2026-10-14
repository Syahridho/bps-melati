import { RekapPeriodFilter } from '@/components/rekap-period-filter';
import { RekapPeriodMatrixTable } from '@/components/rekap-period-matrix-table';
import { RekapPrintActions } from '@/components/rekap-print-actions';
import { RekapSummaryTable } from '@/components/rekap-summary-table';
import { RekapViewModeSelect } from '@/components/rekap-view-mode-select';
import { formatSemesterForFilename } from '@/lib/export-filename';
import { useRekapFilters } from '@/hooks/use-rekap-filters';
import { REKAP_TABLE_NOTES, REKAP_VIEW_MODE_RINGKAS } from '@/lib/rekap-constants';
import AdminPage from '@/pages/admin/page';
import { type PeriodOption, type RekapMatrixPeriodColumn, type RekapMatrixRow, type RekapMatrixTotals, type RekapViewMode } from '@/types/rekap';

interface RekapSemesteranProps {
    rows: RekapMatrixRow[];
    totals: RekapMatrixTotals;
    months: RekapMatrixPeriodColumn[];
    semester: string;
    semesterLabel: string;
    semesters: PeriodOption[];
    /** Mode tampilan aktif dari query `tampilan`; default `detail` bila kosong. */
    tampilan: RekapViewMode;
}

const PRINT_FRAME_ID = 'rekap-semesteran-print-frame';

export default function RekapSemesteran({ rows, totals, months, semester, semesterLabel, semesters, tampilan }: RekapSemesteranProps) {
    const { rolePrefix, printUrl, excelUrl, exportOpen, setExportOpen, handlePeriodChange, handleViewModeChange, handlePrint } = useRekapFilters({
        routeKey: 'rekap-semesteran',
        periodParam: 'semester',
        period: semester,
        frameId: PRINT_FRAME_ID,
        viewMode: tampilan,
        exportPrefix: 'Rekap-Semesteran',
        exportPeriode: formatSemesterForFilename(semester),
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
                    <RekapViewModeSelect value={tampilan} onValueChange={handleViewModeChange} />

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

                {tampilan === REKAP_VIEW_MODE_RINGKAS ? (
                    <RekapSummaryTable variant="period" rows={rows} totals={totals} periods={months} />
                ) : (
                    <RekapPeriodMatrixTable rows={rows} totals={totals} periods={months} />
                )}

                <p className="text-muted-foreground text-xs">{REKAP_TABLE_NOTES[tampilan]}</p>
            </div>
        </AdminPage>
    );
}
