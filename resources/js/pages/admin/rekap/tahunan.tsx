import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import AdminPage from '@/pages/admin/page';
import { router } from '@inertiajs/react';
import { ChevronDown, Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';

/** Urutan kolom klasifikasi harus sama dengan RekapReport::COLUMNS di backend. */
const COLUMN_ORDER = ['pengaduan_pst', 'pengaduan_lainnya', 'aspirasi', 'permintaan_informasi'] as const;

type ColumnKey = (typeof COLUMN_ORDER)[number];

/** Jumlah per kolom klasifikasi untuk satu bulan. */
type PeriodCounts = Record<ColumnKey, number>;

interface RekapRow {
    channel: string;
    /** period (Y-m) -> breakdown 4 kolom klasifikasi */
    perPeriod: Record<string, PeriodCounts>;
    jumlah: number;
    children: RekapRow[];
}

interface RekapTotals {
    jumlah: number;
    /** period (Y-m) -> breakdown 4 kolom klasifikasi */
    [period: string]: PeriodCounts | number;
}

interface MonthColumn {
    key: string;
    label: string;
}

interface YearOption {
    value: string;
    label: string;
}

interface RekapTahunanProps {
    rows: RekapRow[];
    totals: RekapTotals;
    months: MonthColumn[];
    year: string;
    yearLabel: string;
    years: YearOption[];
}

const SUB_COLUMNS = ['PST', 'Lain', 'Asp', 'Inf'];

/** Lebar kolom tetap (px) supaya tabel tidak "ngambang" melebar acak. */
const KANAL_COL_WIDTH = 176;
const DATA_COL_WIDTH = 44;
const JUMLAH_COL_WIDTH = 68;

/** Ambil nilai kolom klasifikasi untuk sebuah bulan, default 0 kalau belum ada data. */
function countFor(perPeriod: Record<string, PeriodCounts> | undefined, periodKey: string, column: ColumnKey): number {
    return perPeriod?.[periodKey]?.[column] ?? 0;
}

export default function RekapTahunan({ rows, totals, months, year, yearLabel, years }: RekapTahunanProps) {
    const [exportOpen, setExportOpen] = useState(false);

    const rolePrefix = useMemo(() => {
        return typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard/operator')
            ? 'dashboard.operator.'
            : 'dashboard.admin.';
    }, []);

    const printUrl = useMemo(() => `${route(`${rolePrefix}rekap-tahunan.print`)}?year=${encodeURIComponent(year)}`, [rolePrefix, year]);

    const excelUrl = useMemo(() => `${route(`${rolePrefix}rekap-tahunan.excel`)}?year=${encodeURIComponent(year)}`, [rolePrefix, year]);

    const handleYearChange = (value: string) => {
        router.get(route(`${rolePrefix}rekap-tahunan.index`), { year: value }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handlePrint = () => {
        const frame = document.getElementById('rekap-tahunan-print-frame') as HTMLIFrameElement | null;
        frame?.contentWindow?.print();
    };

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
                    <Select value={year} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Pilih tahun" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button>
                                <Download className="mr-1.5 h-4 w-4" />
                                Export
                                <ChevronDown className="ml-1.5 h-4 w-4 opacity-70" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => setExportOpen(true)}>
                                <FileText className="mr-2 h-4 w-4 text-red-500" />
                                Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <a href={excelUrl} download>
                                    <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                                    Export Excel
                                </a>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* min-w-0 di setiap level pembungkus mencegah tabel lebar memaksa seluruh
                    halaman melebar (bug flexbox: item flex defaultnya min-width:auto),
                    supaya scrollbar horizontal muncul tepat di bawah tabel, bukan di bawah halaman. */}
                <div className="bg-card min-w-0 overflow-hidden rounded-lg border">
                    <div className="max-h-[70vh] min-w-0 overflow-auto">
                        <table className="w-full table-fixed border-separate border-spacing-0 text-[11px]">
                            <colgroup>
                                <col style={{ width: KANAL_COL_WIDTH }} />
                                {months.map((month) =>
                                    COLUMN_ORDER.map((column) => <col key={`${month.key}-${column}-col`} style={{ width: DATA_COL_WIDTH }} />),
                                )}
                                <col style={{ width: JUMLAH_COL_WIDTH }} />
                            </colgroup>

                            <thead className="sticky top-0 z-30">
                                <tr>
                                    <th
                                        rowSpan={2}
                                        className="bg-muted sticky left-0 z-40 border-r border-b px-2 py-2 text-left align-middle font-semibold"
                                    >
                                        Sumber Kanal
                                    </th>
                                    {months.map((month, monthIndex) => (
                                        <th
                                            key={month.key}
                                            colSpan={4}
                                            className={cn(
                                                'bg-muted border-b py-1.5 text-center font-semibold',
                                                monthIndex % 2 === 1 && 'bg-muted/70',
                                                'border-r-border border-r-2',
                                            )}
                                        >
                                            {month.label}
                                        </th>
                                    ))}
                                    <th rowSpan={2} className="bg-muted border-b py-2 text-center align-middle font-semibold">
                                        Jumlah
                                    </th>
                                </tr>
                                <tr>
                                    {months.map((month, monthIndex) =>
                                        SUB_COLUMNS.map((sub, subIndex) => (
                                            <th
                                                key={`${month.key}-${sub}`}
                                                className={cn(
                                                    'text-muted-foreground border-b py-1 text-center text-[10px] font-normal',
                                                    monthIndex % 2 === 1 ? 'bg-muted/70' : 'bg-muted',
                                                    subIndex === 3 ? 'border-r-border border-r-2' : 'border-r-border/40 border-r',
                                                )}
                                            >
                                                {sub}
                                            </th>
                                        )),
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={months.length * 4 + 2} className="text-muted-foreground h-24 text-center">
                                            Belum ada data untuk periode ini.
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => <RekapRowFragment key={row.channel} row={row} months={months} />)
                                )}
                            </tbody>

                            <tfoot>
                                <tr className="bg-muted/80">
                                    <td className="bg-muted sticky left-0 z-10 border-r font-semibold">Total</td>
                                    {months.map((month, monthIndex) =>
                                        COLUMN_ORDER.map((column, index) => (
                                            <td
                                                key={`${month.key}-${column}`}
                                                className={cn(
                                                    'border-t py-1.5 text-center font-medium tabular-nums',
                                                    index === 3 ? 'border-r-border border-r-2' : 'border-r-border/40 border-r',
                                                    monthIndex % 2 === 1 && 'bg-muted/70',
                                                )}
                                            >
                                                {(totals[month.key] as PeriodCounts | undefined)?.[column] ?? 0}
                                            </td>
                                        )),
                                    )}
                                    <td className="border-t py-1.5 text-center font-semibold tabular-nums">{totals.jumlah}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <p className="text-muted-foreground text-xs">
                    PST = Pengaduan Layanan PST, Lain = Pengaduan Layanan Lainnya, Asp = Aspirasi, Inf = Permintaan Informasi. Baris kanal induk
                    berwarna abu-abu karena tidak dapat dipilih saat input data.
                </p>
            </div>

            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent className="max-w-6xl">
                    <DialogHeader>
                        <DialogTitle>Export PDF — Rekap Tahunan {yearLabel}</DialogTitle>
                        <DialogDescription>
                            Pratinjau di bawah adalah dokumen berorientasi landscape lengkap dengan kop surat. Gunakan tombol Cetak lalu pilih
                            &ldquo;Save as PDF&rdquo; pada dialog printer untuk menyimpan berkas.
                        </DialogDescription>
                    </DialogHeader>

                    {exportOpen && (
                        <iframe
                            id="rekap-tahunan-print-frame"
                            src={printUrl}
                            title={`Pratinjau rekap ${yearLabel}`}
                            className="h-[60vh] w-full rounded-md border bg-white"
                        />
                    )}

                    <DialogFooter>
                        <Button onClick={handlePrint}>
                            <Printer />
                            Cetak / Simpan PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPage>
    );
}

function RekapRowFragment({ row, months }: { row: RekapRow; months: MonthColumn[] }) {
    const hasChildren = row.children && row.children.length > 0;
    const rightColSpan = months.length * 4 + 1;

    return (
        <>
            <tr className={cn(hasChildren ? 'bg-muted/50 font-semibold' : 'hover:bg-muted/30')}>
                <td className={cn('sticky left-0 z-10 border-r border-b px-2 py-1.5', hasChildren ? 'bg-muted/50' : 'bg-card')}>{row.channel}</td>

                {hasChildren ? (
                    <td colSpan={rightColSpan} className="bg-muted/50 border-b" />
                ) : (
                    <>
                        {months.map((month, monthIndex) =>
                            COLUMN_ORDER.map((column, index) => (
                                <td
                                    key={`${month.key}-${column}`}
                                    className={cn(
                                        'border-b py-1.5 text-center tabular-nums',
                                        index === 3 ? 'border-r-border border-r-2' : 'border-r-border/40 border-r',
                                        monthIndex % 2 === 1 && 'bg-muted/20',
                                    )}
                                >
                                    {countFor(row.perPeriod, month.key, column)}
                                </td>
                            )),
                        )}
                        <td className="border-b py-1.5 text-center font-medium tabular-nums">{row.jumlah}</td>
                    </>
                )}
            </tr>

            {hasChildren &&
                row.children.map((child) => (
                    <tr key={`${row.channel}-${child.channel}`} className="hover:bg-muted/30">
                        <td className="bg-card text-muted-foreground sticky left-0 z-10 border-r border-b py-1.5 pr-2 pl-6">{child.channel}</td>
                        {months.map((month, monthIndex) =>
                            COLUMN_ORDER.map((column, index) => (
                                <td
                                    key={`${month.key}-${column}`}
                                    className={cn(
                                        'border-b py-1.5 text-center tabular-nums',
                                        index === 3 ? 'border-r-border border-r-2' : 'border-r-border/40 border-r',
                                        monthIndex % 2 === 1 && 'bg-muted/20',
                                    )}
                                >
                                    {countFor(child.perPeriod, month.key, column)}
                                </td>
                            )),
                        )}
                        <td className="border-b py-1.5 text-center font-medium tabular-nums">{child.jumlah}</td>
                    </tr>
                ))}
        </>
    );
}
