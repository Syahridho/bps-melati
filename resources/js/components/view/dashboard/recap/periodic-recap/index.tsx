import { RekapChatMultiSelect } from '@/components/molecules/recap-chat-multi-select';
import { RekapChatSelect } from '@/components/molecules/recap-chat-select';
import { RekapPeriodMatrixTable } from '@/components/organisms/recap/recap-period-matrix-table';
import { RekapPeriodikFilter } from '@/components/molecules/recap-periodic-filter';
import { RekapPrintActions } from '@/components/organisms/recap/recap-print-actions';
import { RekapSummaryTable } from '@/components/organisms/recap/recap-summary-table';
import { RekapViewModeSelect } from '@/components/molecules/recap-view-mode-select';
import { useRekapFilters } from '@/hooks/use-rekap-filters';
import AdminPage from '@/layouts/dashboard/page';
import { REKAP_TABLE_NOTES, REKAP_VIEW_MODE_RINGKAS } from '@/lib/rekap-constants';
import { PeriodicRecapProps } from '@/types/recap';
import { Info } from 'lucide-react';

const PRINT_FRAME_ID = 'periodic-recap-print-frame';

export default function PeriodicRecapView({
    rows,
    totals,
    months,
    year,
    selectedMonths,
    years,
    monthOptions,
    periodeLabel,
    tampilan,
    chat = '0',
}: PeriodicRecapProps) {
    const monthsParam = selectedMonths.join(',');

    const { rolePrefix, printUrl, excelUrl, exportOpen, setExportOpen, handleParamChange, handleViewModeChange, handlePrint } = useRekapFilters({
        routeKey: 'periodic-recap',
        queryParams: { year, months: monthsParam, chat },
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
            description={`Rekapitulasi laporan berdasarkan periode yang dipilih : ${periodeLabel}`}
            breadcrumbs={[
                { title: 'Rekap', href: route(`${rolePrefix}periodic-recap.index`) },
                { title: 'Periodik', href: route(`${rolePrefix}periodic-recap.index`) },
            ]}
        >
            <div className="flex flex-col gap-4 pb-10">
                <div className="flex flex-wrap items-center justify-between gap-2">
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

                        <RekapChatSelect
                            value={chat === '0' ? '0' : '1'}
                            onValueChange={(val) => {
                                if (val === '0') {
                                    handleParamChange('chat', '0');
                                } else {
                                    handleParamChange('chat', selectedMonths.join(','));
                                }
                            }}
                        />
                        {chat !== '0' && (
                            <RekapChatMultiSelect
                                selectedMonths={selectedMonths}
                                monthOptions={monthOptions}
                                value={chat.split(',')}
                                onChange={(vals) => handleParamChange('chat', vals.join(','))}
                            />
                        )}

                        <RekapPrintActions
                            excelUrl={excelUrl}
                            printUrl={printUrl}
                            exportOpen={exportOpen}
                            onExportOpenChange={setExportOpen}
                            onPrint={handlePrint}
                            dialogTitle={`Export PDF — Rekap Periodik ${periodeLabel}${chat === '1' ? ' (dengan chat)' : ''}`}
                            frameTitle={`Pratinjau rekap ${periodeLabel}`}
                            frameId={PRINT_FRAME_ID}
                            dialogContentClassName="max-w-6xl"
                            dialogDescription="Pratinjau di bawah adalah dokumen berorientasi landscape lengkap dengan kop surat. Gunakan tombol Cetak lalu pilih “Save as PDF” pada dialog printer untuk menyimpan berkas."
                        />
                    </div>
                </div>

                {chat !== '0' && (
                    <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                        <Info className="size-4 shrink-0" />
                        <span>
                            <strong>Perhatian Privasi:</strong> PDF akan memuat data pelapor dan seluruh isi percakapan tiket. Gunakan dengan
                            hati-hati untuk menjaga kerahasiaan data pelapor. Chat hanya ditampilkan pada export PDF (tabel rekap dan Excel tetap
                            tanpa chat).
                        </span>
                    </div>
                )}

                {rows.length === 0 || months.length === 0 ? (
                    <div className="text-muted-foreground flex flex-col items-center justify-center rounded-md border border-dashed py-16">
                        <p className="text-sm font-medium">Tidak ada data untuk periode ini</p>
                        <p className="mt-1 text-xs">Coba pilih tahun atau bulan lain.</p>
                    </div>
                ) : tampilan === REKAP_VIEW_MODE_RINGKAS ? (
                    <RekapSummaryTable variant="period" rows={rows} totals={totals} periods={months} periodLabel={periodeLabel} />
                ) : (
                    <RekapPeriodMatrixTable rows={rows} totals={totals} periods={months} periodLabel={periodeLabel} />
                )}

                <p className="text-muted-foreground text-xs">{REKAP_TABLE_NOTES[tampilan]}</p>
            </div>
        </AdminPage>
    );
}
