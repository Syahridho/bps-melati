import { RekapPeriodFilter } from '@/components/molecules/recap-period-filter';
import { RekapPrintActions } from '@/components/organisms/recap/recap-print-actions';
import { RekapTable } from '@/components/organisms/recap/recap-table';
import { useRekapFilters } from '@/hooks/use-rekap-filters';
import AdminPage from '@/layouts/dashboard/page';
import { MonthlyRecapProps } from '@/types/recap';

export default function MonthlyRecapView({ rows, totals, year, month, years, months, periodLabel }: MonthlyRecapProps) {
    const { rolePrefix, printUrl, excelUrl, exportOpen, setExportOpen, handleParamChange, handlePrint } = useRekapFilters({
        routeKey: 'monthly-recap',
        queryParams: { year, month },
        exportPrefix: 'Rekap-Bulanan',
        exportPeriode: periodLabel.replace(/\s+/g, '-'),
    });

    return (
        <AdminPage
            title="Rekap Bulanan"
            description={`Rekapitulasi laporan bulan ${periodLabel}`}
            breadcrumbs={[
                { title: 'Rekap', href: route(`${rolePrefix}monthly-recap.index`) },
                { title: 'Bulanan', href: route(`${rolePrefix}monthly-recap.index`) },
            ]}
        >
            <div className="flex flex-col gap-4 pb-10">
                <div className="flex flex-wrap items-center gap-3">
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
