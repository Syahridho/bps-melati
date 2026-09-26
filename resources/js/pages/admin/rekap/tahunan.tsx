import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import AdminPage from '@/pages/admin/page';
import { router } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { useMemo, useState } from 'react';

interface RekapRow {
    channel: string;
    perPeriod: Record<string, number>;
    jumlah: number;
    children: RekapRow[];
}

interface RekapTotals {
    jumlah: number;
    [period: string]: number;
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

export default function RekapTahunan({ rows, totals, months, year, yearLabel, years }: RekapTahunanProps) {
    const [exportOpen, setExportOpen] = useState(false);

    const printUrl = useMemo(
        () => `${route('dashboard.admin.rekap-tahunan.print')}?year=${encodeURIComponent(year)}`,
        [year],
    );

    const handleYearChange = (value: string) => {
        router.get(route('dashboard.admin.rekap-tahunan.index'), { year: value }, { preserveState: true, preserveScroll: true, replace: true });
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
                { title: 'Rekap', href: '/dashboard/admin/rekap-tahunan' },
                { title: 'Tahunan', href: '/dashboard/admin/rekap-tahunan' },
            ]}
        >
            <div className="flex flex-col gap-4">
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

                    <Button onClick={() => setExportOpen(true)}>
                        <Printer />
                        Export PDF
                    </Button>
                </div>

                <div className="overflow-hidden rounded-lg border bg-card">
                    {/* 50 kolom: tabel digulir dua arah dan kolom Kanal tetap terlihat. */}
                    <div className="max-h-[70vh] overflow-auto">
                        <Table className="min-w-[1800px] border-collapse text-[11px]">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead rowSpan={2} className="sticky left-0 z-20 border-r bg-muted">
                                    Kanal
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
                                            className={cn('text-center text-[10px] font-normal text-muted-foreground', index === 3 && 'border-r')}
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
                                    <TableCell colSpan={months.length * 4 + 2} className="h-24 text-center text-muted-foreground">
                                        Belum ada data untuk periode ini.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => <RekapRowFragment key={row.channel} row={row} months={months} />)
                            )}
                        </TableBody>

                        <TableFooter>
                            <TableRow className="bg-muted/60 hover:bg-muted/60">
                                <TableCell className="sticky left-0 z-10 border-r bg-muted/60 font-semibold">Total</TableCell>
                                {months.map((month) => (
                                    <TableCell
                                        key={month.key}
                                        colSpan={4}
                                        className="border-r text-center font-medium tabular-nums"
                                    >
                                        {totals[month.key] ?? 0}
                                    </TableCell>
                                ))}
                                <TableCell className="text-center font-medium tabular-nums">{totals.jumlah}</TableCell>
                            </TableRow>
                        </TableFooter>
                        </Table>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground">
                    PST = Pengaduan Layanan PST, Lain = Pengaduan Layanan Lainnya, Asp = Aspirasi, Inf = Permintaan Informasi.
                    Baris kanal induk berwarna abu-abu karena tidak dapat dipilih saat input data.
                </p>
            </div>

            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent className="max-w-6xl">
                    <DialogHeader>
                        <DialogTitle>Export PDF — Rekap Tahunan {yearLabel}</DialogTitle>
                        <DialogDescription>
                            Pratinjau di bawah adalah dokumen berorientasi landscape lengkap dengan kop surat. Gunakan tombol Cetak lalu
                            pilih &ldquo;Save as PDF&rdquo; pada dialog printer untuk menyimpan berkas.
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
    return (
        <>
            {/* Kanal induk tidak bisa dipilih saat input data, jadi barisnya
                selalu kosong dan ditandai abu-abu agar tidak diisi angka. */}
            <TableRow className="bg-muted/60 font-semibold text-muted-foreground hover:bg-muted/60">
                <TableCell className="sticky left-0 z-10 border-r bg-muted/60">{row.channel}</TableCell>
                {months.map((month) => (
                    <TableCell key={month.key} colSpan={4} className="border-r text-center tabular-nums">
                        {row.perPeriod[month.key] ?? 0}
                    </TableCell>
                ))}
                <TableCell className="text-center font-medium tabular-nums">{row.jumlah}</TableCell>
            </TableRow>

            {row.children.map((child) => (
                <TableRow key={`${row.channel}-${child.channel}`} className="hover:bg-muted/40">
                    <TableCell className="sticky left-0 z-10 border-r bg-card pl-6 text-muted-foreground">{child.channel}</TableCell>
                    {months.map((month) => (
                        <TableCell key={month.key} colSpan={4} className="border-r text-center tabular-nums">
                            {child.perPeriod[month.key] ?? 0}
                        </TableCell>
                    ))}
                    <TableCell className="text-center font-medium tabular-nums">{child.jumlah}</TableCell>
                </TableRow>
            ))}
        </>
    );
}
