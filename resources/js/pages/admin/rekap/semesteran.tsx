import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

interface SemesterOption {
    value: string;
    label: string;
}

interface RekapSemesteranProps {
    rows: RekapRow[];
    totals: RekapTotals;
    months: MonthColumn[];
    semester: string;
    semesterLabel: string;
    semesters: SemesterOption[];
}

const SUB_COLUMNS = ['PST', 'Lain', 'Asp', 'Inf'];

/** Ambil nilai kolom klasifikasi untuk sebuah bulan, default 0 kalau belum ada data. */
function countFor(perPeriod: Record<string, PeriodCounts> | undefined, periodKey: string, column: ColumnKey): number {
    return perPeriod?.[periodKey]?.[column] ?? 0;
}

export default function RekapSemesteran({ rows, totals, months, semester, semesterLabel, semesters }: RekapSemesteranProps) {
    const [exportOpen, setExportOpen] = useState(false);

    const rolePrefix = useMemo(() => {
        return typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard/operator')
            ? 'dashboard.operator.'
            : 'dashboard.admin.';
    }, []);

    const printUrl = useMemo(
        () => `${route(`${rolePrefix}rekap-semesteran.print`)}?semester=${encodeURIComponent(semester)}`,
        [rolePrefix, semester],
    );

    const excelUrl = useMemo(
        () => `${route(`${rolePrefix}rekap-semesteran.excel`)}?semester=${encodeURIComponent(semester)}`,
        [rolePrefix, semester],
    );

    const handleSemesterChange = (value: string) => {
        router.get(route(`${rolePrefix}rekap-semesteran.index`), { semester: value }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handlePrint = () => {
        const frame = document.getElementById('rekap-semesteran-print-frame') as HTMLIFrameElement | null;
        frame?.contentWindow?.print();
    };

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
                    <Select value={semester} onValueChange={handleSemesterChange}>
                        <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Pilih semester" />
                        </SelectTrigger>
                        <SelectContent>
                            {semesters.map((option) => (
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

                <div className="bg-card overflow-hidden rounded-lg border">
                    {/* 26 kolom: tabel digulir dua arah dan kolom Kanal tetap terlihat. */}
                    <div className="max-h-[70vh] overflow-auto">
                        <Table className="min-w-[1100px] border-collapse text-[11px]">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead rowSpan={2} className="bg-muted sticky left-0 z-20 border-r after:bg-border after:absolute after:top-0 after:right-0 after:h-full after:w-px">
                                       Sumber Kanal
                                    </TableHead>
                                    {months.map((month) => (
                                        <TableHead key={month.key} colSpan={4} className="border-r text-center font-semibold">
                                            {month.label}
                                        </TableHead>
                                    ))}
                                    <TableHead rowSpan={2} className="text-center font-semibold">
                                        Jumlah
                                    </TableHead>
                                </TableRow>
                                <TableRow className="hover:bg-transparent">
                                    {months.map((month) =>
                                        SUB_COLUMNS.map((sub, index) => (
                                            <TableHead
                                                key={`${month.key}-${sub}`}
                                                className={cn('text-muted-foreground text-center text-[10px] font-normal after:bg-border after:absolute after:top-0 after:right-0 after:h-full after:w-px', index === 3 && 'border-r')}
                                            >
                                                {sub}
                                            </TableHead>
                                        )),
                                    )}
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={months.length * 4 + 2} className="text-muted-foreground h-24 text-center">
                                            Belum ada data untuk periode ini.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((row) => <RekapRowFragment key={row.channel} row={row} months={months} />)
                                )}
                            </TableBody>

                            <TableFooter>
                                <TableRow className="bg-muted/60 hover:bg-muted/60">
                                    <TableCell className="bg-muted sticky left-0 z-10 border-r font-semibold">Total</TableCell>
                                    {months.map((month) =>
                                        COLUMN_ORDER.map((column, index) => (
                                            <TableCell
                                                key={`${month.key}-${column}`}
                                                className={cn('text-center font-medium tabular-nums', index === 3 && 'border-r')}
                                            >
                                                {(totals[month.key] as PeriodCounts | undefined)?.[column] ?? 0}
                                            </TableCell>
                                        )),
                                    )}
                                    <TableCell className="text-center font-medium tabular-nums">{totals.jumlah}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
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
                        <DialogTitle>Export PDF — Rekap Semesteran {semesterLabel}</DialogTitle>
                        <DialogDescription>
                            Pratinjau di bawah adalah dokumen berorientasi landscape lengkap dengan kop surat. Gunakan tombol Cetak lalu pilih
                            &ldquo;Save as PDF&rdquo; pada dialog printer untuk menyimpan berkas.
                        </DialogDescription>
                    </DialogHeader>

                    {exportOpen && (
                        <iframe
                            id="rekap-semesteran-print-frame"
                            src={printUrl}
                            title={`Pratinjau rekap ${semesterLabel}`}
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
            <TableRow className={cn(hasChildren ? 'bg-muted/60 hover:bg-muted/60 font-semibold' : 'hover:bg-muted/40')}>
                <TableCell className={cn('sticky left-0 z-10 border-r', hasChildren ? 'bg-muted' : 'bg-card')}>{row.channel}</TableCell>

                {hasChildren ? (
                    <TableCell colSpan={rightColSpan} className="bg-muted/60" />
                ) : (
                    <>
                        {months.map((month) =>
                            COLUMN_ORDER.map((column, index) => (
                                <TableCell key={`${month.key}-${column}`} className={cn('text-center tabular-nums', index === 3 && 'border-r')}>
                                    {countFor(row.perPeriod, month.key, column)}
                                </TableCell>
                            )),
                        )}
                        <TableCell className="text-center font-medium tabular-nums">{row.jumlah}</TableCell>
                    </>
                )}
            </TableRow>

            {hasChildren &&
                row.children.map((child) => (
                    <TableRow key={`${row.channel}-${child.channel}`} className="hover:bg-muted/40">
                        <TableCell className="bg-card text-muted-foreground sticky left-0 z-10 border-r pl-6">{child.channel}</TableCell>
                        {months.map((month) =>
                            COLUMN_ORDER.map((column, index) => (
                                <TableCell key={`${month.key}-${column}`} className={cn('text-center tabular-nums', index === 3 && 'border-r')}>
                                    {countFor(child.perPeriod, month.key, column)}
                                </TableCell>
                            )),
                        )}
                        <TableCell className="text-center font-medium tabular-nums">{child.jumlah}</TableCell>
                    </TableRow>
                ))}
        </>
    );
}
