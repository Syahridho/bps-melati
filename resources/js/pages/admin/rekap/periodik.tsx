import { RekapPeriodMatrixTable } from '@/components/rekap-period-matrix-table';
import { RekapPrintActions } from '@/components/rekap-print-actions';
import { RekapSummaryTable } from '@/components/rekap-summary-table';
import { RekapViewModeSelect } from '@/components/rekap-view-mode-select';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRekapFilters } from '@/hooks/use-rekap-filters';
import { REKAP_TABLE_NOTES, REKAP_VIEW_MODE_RINGKAS } from '@/lib/rekap-constants';
import AdminPage from '@/pages/admin/page';
import { type PeriodOption, type RekapMatrixPeriodColumn, type RekapMatrixRow, type RekapMatrixTotals, type RekapViewMode } from '@/types/rekap';
import { RotateCcw } from 'lucide-react';

interface RekapPeriodikProps {
    rows: RekapMatrixRow[];
    totals: RekapMatrixTotals;
    months: RekapMatrixPeriodColumn[];
    year: string;
    dari: string;
    sampai: string;
    years: PeriodOption[];
    monthOptions: PeriodOption[];
    periodeLabel: string;
    tampilan: RekapViewMode;
}

const PRINT_FRAME_ID = 'rekap-periodik-print-frame';

const MONTH_NAMES: Record<string, string> = {
    '1': 'Januari',
    '2': 'Februari',
    '3': 'Maret',
    '4': 'April',
    '5': 'Mei',
    '6': 'Juni',
    '7': 'Juli',
    '8': 'Agustus',
    '9': 'September',
    '10': 'Oktober',
    '11': 'November',
    '12': 'Desember',
};

export default function RekapPeriodik({ rows, totals, months, year, dari, sampai, years, monthOptions, periodeLabel, tampilan }: RekapPeriodikProps) {
    const { rolePrefix, printUrl, excelUrl, exportOpen, setExportOpen, handleParamChange, handleViewModeChange, handlePrint, navigate } = useRekapFilters({
        routeKey: 'rekap-periodik',
        queryParams: { year, dari, sampai },
        frameId: PRINT_FRAME_ID,
        viewMode: tampilan,
        exportPrefix: 'Rekap-Periodik',
        exportPeriode: dari === sampai ? `${MONTH_NAMES[dari]}-${year}` : `${MONTH_NAMES[dari]}-${MONTH_NAMES[sampai]}-${year}`,
    });

    const currentYear = new Date().getFullYear().toString();
    const isDefault = year === currentYear && dari === '1' && sampai === '12';

    const handleDariChange = (newDari: string) => {
        const d = parseInt(newDari, 10);
        const s = parseInt(sampai, 10);
        const nextSampai = d > s ? newDari : sampai;
        navigate({ year, dari: newDari, sampai: nextSampai });
    };

    const handleSampaiChange = (newSampai: string) => {
        const d = parseInt(dari, 10);
        const s = parseInt(newSampai, 10);
        const nextDari = s < d ? newSampai : dari;
        navigate({ year, dari: nextDari, sampai: newSampai });
    };

    const handleYearChange = (newYear: string) => {
        navigate({ year: newYear, dari, sampai });
    };

    const handleReset = () => {
        navigate({ year: currentYear, dari: '1', sampai: '12' });
    };

    return (
        <AdminPage
            title="Rekap Periodik"
            description={`Rekapitulasi laporan ${periodeLabel}`}
            breadcrumbs={[
                { title: 'Rekap', href: route(`${rolePrefix}rekap-bulanan.index`) },
                { title: 'Periodik', href: route(`${rolePrefix}rekap-periodik.index`) },
            ]}
        >
            <div className="flex flex-col gap-4 pb-10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <RekapViewModeSelect value={tampilan} onValueChange={handleViewModeChange} />

                        <Select value={year} onValueChange={handleYearChange}>
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="Pilih tahun" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((y) => (
                                    <SelectItem key={y.value} value={y.value}>
                                        {y.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1.5 text-sm">
                            <span className="text-muted-foreground">Dari:</span>
                            <Select value={dari} onValueChange={handleDariChange}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Dari bulan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map((m) => (
                                        <SelectItem key={`dari-${m.value}`} value={m.value} disabled={m.disabled}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <span className="text-muted-foreground ml-1">S/d:</span>
                            <Select value={sampai} onValueChange={handleSampaiChange}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Sampai bulan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map((m) => {
                                        const isBeforeDari = parseInt(m.value, 10) < parseInt(dari, 10);
                                        return (
                                            <SelectItem key={`sampai-${m.value}`} value={m.value} disabled={m.disabled || isBeforeDari}>
                                                {m.label}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {!isDefault && (
                            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 h-10">
                                <RotateCcw className="size-3.5" />
                                Reset
                            </Button>
                        )}
                    </div>

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
