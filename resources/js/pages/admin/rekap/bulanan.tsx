import { RekapPeriodFilter } from '@/components/rekap-period-filter';
import { RekapPrintActions } from '@/components/rekap-print-actions';
import { RekapTable } from '@/components/rekap-table';
import { useRekapFilters } from '@/hooks/use-rekap-filters';
import AdminPage from '@/pages/admin/page';
import { type PeriodOption, type RekapRow, type RekapTotals } from '@/types/rekap';

interface RekapBulananProps {
    rows: RekapRow[];
    totals: RekapTotals;
    period: string;
    periodLabel: string;
    periods: PeriodOption[];
}

export default function RekapBulanan({ rows, totals, period, periodLabel, periods }: RekapBulananProps) {
    const { rolePrefix, printUrl, excelUrl, exportOpen, setExportOpen, handlePeriodChange, handlePrint } = useRekapFilters({
        routeKey: 'rekap-bulanan',
        periodParam: 'period',
        period,
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
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-muted-foreground text-sm">
                        Periode <span className="text-foreground font-medium">{periodLabel}</span>
                    </p>

                    <div className="flex items-center gap-2">
                        <RekapPeriodFilter value={period} periods={periods} onValueChange={handlePeriodChange} />

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
