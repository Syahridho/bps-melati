import { RekapPeriodMatrixTable } from '@/components/rekap-period-matrix-table';
import { RekapPeriodikFilter } from '@/components/rekap-periodik-filter';
import { RekapPrintActions } from '@/components/rekap-print-actions';
import { RekapSummaryTable } from '@/components/rekap-summary-table';
import { RekapViewModeSelect } from '@/components/rekap-view-mode-select';
import { useRekapFilters } from '@/hooks/use-rekap-filters';
import { REKAP_TABLE_NOTES, REKAP_VIEW_MODE_RINGKAS } from '@/lib/rekap-constants';
import AdminPage from '@/pages/admin/page';
import {
    type PeriodOption,
    type RekapMatrixPeriodColumn,
    type RekapMatrixRow,
    type RekapMatrixTotals,
    type RekapViewMode,
} from '@/types/rekap';

interface RekapPeriodikProps {
    rows: RekapMatrixRow[];
    totals: RekapMatrixTotals;
    months: RekapMatrixPeriodColumn[];
    year: string;
    selectedMonths: string[];
    years: PeriodOption[];
    monthOptions: PeriodOption[];
    periodeLabel: string;
    tampilan: RekapViewMode;
}

const PRINT_FRAME_ID = 'rekap-periodik-print-frame';

export default function RekapPeriodik({
    rows,
    totals,
    months,
    year,
    selectedMonths,
    years,
    monthOptions,
    periodeLabel,
    tampilan,
}: RekapPeriodikProps) {
    const monthsParam = selectedMonths.join(',');

    const {
        rolePrefix,
        printUrl,
        excelUrl,
        exportOpen,
        setExportOpen,
        handleParamChange,
        handleViewModeChange,
        handlePrint,
    } = useRekapFilters({
        routeKey: 'rekap-periodik',
        queryParams: { year, months: monthsParam },
        frameId: PRINT_FRAME_ID,
        viewMode: tampilan,
        exportPrefix: 'Rekap-Periodik',
        exportPeriode: `${year}-M${selectedMonths.length === 12 ? 'Full' : selectedMonths.join('-')}`,
    });

    const handleMonthsChange = (newMonths: string[]) => {
        handleParamChange('months', newMonths.join(','));
    };

    return (
        <AdminPage
            title="Rekap Periodik"
            description="Rekapitulasi laporan berdasarkan periode yang dipilih"
            breadcrumbs={[
                { title: 'Rekap', href: route(`${rolePrefix}rekap-periodik.index`) },
                { title: 'Periodik', href: route(`${rolePrefix}rekap-periodik.index`) },
            ]}
        >
            <div className="flex flex-col gap-4 pb-10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                        Periode aktif: <span className="font-semibold text-foreground">{periodeLabel}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <RekapViewModeSelect value={tampilan} onValueChange={handleViewModeChange} />

                        <RekapPeriodikFilter
                            year={year}
                            years={years}
                            onYearChange={(y) => handleParamChange('year', y)}
                            selectedMonths={selectedMonths}
                            monthOptions={monthOptions}
                            onMonthsChange={handleMonthsChange}
                        />

                        <RekapPrintActions
                            excelUrl={excelUrl}
                            printUrl={printUrl}
                            exportOpen={exportOpen}
                            onExportOpenChange={setExportOpen}
                            onPrint={handlePrint}
                            dialogTitle={`Export PDF — Rekap Periodik ${periodeLabel}`}
                            frameTitle={`Pratinjau rekap ${periodeLabel}`}
                            frameId={PRINT_FRAME_ID}
                            dialogContentClassName="max-w-6xl"
                            dialogDescription="Pratinjau di bawah adalah dokumen berorientasi landscape lengkap dengan kop surat. Gunakan tombol Cetak lalu pilih “Save as PDF” pada dialog printer untuk menyimpan berkas."
                        />
                    </div>
                </div>

                {rows.length === 0 || months.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16 text-muted-foreground">
                        <p className="text-sm font-medium">Tidak ada data untuk periode ini</p>
                        <p className="text-xs mt-1">Coba pilih tahun atau bulan lain.</p>
                    </div>
                ) : tampilan === REKAP_VIEW_MODE_RINGKAS ? (
                    <RekapSummaryTable variant="period" rows={rows} totals={totals} periods={months} />
                ) : (
                    <RekapPeriodMatrixTable rows={rows} totals={totals} periods={months} />
                )}

                <p className="text-muted-foreground text-xs">{REKAP_TABLE_NOTES[tampilan]}</p>
            </div>
        </AdminPage>
    );
}
