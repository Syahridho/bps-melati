import { RekapPeriodFilter } from '@/components/rekap-period-filter';
import { RekapPrintActions } from '@/components/rekap-print-actions';
import { RekapTable } from '@/components/rekap-table';
import { useRekapFilters } from '@/hooks/use-rekap-filters';
import AdminPage from '@/pages/admin/page';
import { type PeriodOption, type RekapRow, type RekapTotals } from '@/types/rekap';

interface RekapBulananProps {
    rows: RekapRow[];
    totals: RekapTotals;
    year: string;
    month: string;
    years: PeriodOption[];
    months: PeriodOption[];
    periodLabel: string;
}

export default function RekapBulanan({ rows, totals, year, month, years, months, periodLabel }: RekapBulananProps) {
    const { rolePrefix, printUrl, excelUrl, exportOpen, setExportOpen, handleParamChange, handlePrint } = useRekapFilters({
        routeKey: 'rekap-bulanan',
        queryParams: { year, month },
        exportPrefix: 'Rekap-Bulanan',
        exportPeriode: periodLabel.replace(/\s+/g, '-'),
    });

    return (
        <AdminPage
            title="Rekap Bulanan"
            description="Rekapitulasi laporan per bulan"
            breadcrumbs={[
                { title: 'Rekap', href: route(`${rolePrefix}rekap-bulanan.index`) },
                { title: 'Bulanan', href: route(`${rolePrefix}rekap-bulanan.index`) },
            ]}
        >
            <div className="flex flex-col gap-4 pb-10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-muted-foreground text-sm">
                        Periode <span className="text-foreground font-medium">{periodLabel}</span>
                    </p>

                    <div className="flex items-center gap-2">
                        <RekapPeriodFilter
                            year={year}
                            years={years}
                            onYearChange={(y) => handleParamChange('year', y)}
                            monthOrSemester={month}
                            monthOrSemesters={months}
                            onMonthOrSemesterChange={(m) => handleParamChange('month', m)}
                            secondaryPlaceholder="Pilih bulan"
                            yearTriggerClassName="w-36"
                            secondaryTriggerClassName="w-48"
                        />

                        <RekapPrintActions
                            excelUrl={excelUrl}
                            printUrl={printUrl}
                            exportOpen={exportOpen}
                            onExportOpenChange={setExportOpen}
                            onPrint={handlePrint}
                            dialogTitle={`Export PDF — Rekap Bulanan ${periodLabel}`}
                            frameTitle={`Pratinjau rekap ${periodLabel}`}
                        />
                    </div>
                </div>

                <RekapTable rows={rows} totals={totals} periodLabel={periodLabel} />
            </div>
        </AdminPage>
    );
}
