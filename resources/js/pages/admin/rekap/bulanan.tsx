import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import AdminPage from '@/pages/admin/page';
import { router } from '@inertiajs/react';
import { Download, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';

interface RekapRow {
    channel: string;
    isParent: boolean;
    pengaduan_pst: number;
    pengaduan_lainnya: number;
    aspirasi: number;
    permintaan_informasi: number;
    jumlah: number;
    children: RekapRow[];
}

type RekapTotals = Omit<RekapRow, 'channel' | 'isParent' | 'children'>;

interface PeriodOption {
    value: string;
    label: string;
}

interface RekapBulananProps {
    rows: RekapRow[];
    totals: RekapTotals;
    period: string;
    periodLabel: string;
    periods: PeriodOption[];
}

const COLUMNS: { key: keyof RekapTotals; label: string }[] = [
    { key: 'pengaduan_pst', label: 'Layanan PST' },
    { key: 'pengaduan_lainnya', label: 'Layanan Lainnya' },
    { key: 'aspirasi', label: 'Aspirasi' },
    { key: 'permintaan_informasi', label: 'Permintaan Informasi' },
    { key: 'jumlah', label: 'Jumlah' },
];

export default function RekapBulanan({ rows, totals, period, periodLabel, periods }: RekapBulananProps) {
    const [exportOpen, setExportOpen] = useState(false);

    const printUrl = useMemo(
        () => `${route('dashboard.admin.rekap-bulanan.print')}?period=${encodeURIComponent(period)}`,
        [period],
    );

    const handlePeriodChange = (value: string) => {
        router.get(route('dashboard.admin.rekap-bulanan.index'), { period: value }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handlePrint = () => {
        const frame = document.getElementById('rekap-print-frame') as HTMLIFrameElement | null;
        frame?.contentWindow?.print();
    };

    return (
        <AdminPage
            title="Rekap Bulanan"
            description="Rekapitulasi laporan per bulan"
            breadcrumbs={[
                { title: 'Rekap', href: route('dashboard.admin.rekap-bulanan.index') },
                { title: 'Bulanan', href: route('dashboard.admin.rekap-bulanan.index') },
            ]}
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                        Periode <span className="font-medium text-foreground">{periodLabel}</span>
                    </p>

                    <div className="flex items-center gap-2">
                        <Select value={period} onValueChange={handlePeriodChange}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Pilih periode" />
                            </SelectTrigger>
                            <SelectContent>
                                {periods.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button onClick={() => setExportOpen(true)}>
                            <Download />
                            Export PDF
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-lg border bg-card">
                    <Table className="border-collapse text-xs sm:text-sm">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead colSpan={COLUMNS.length + 1} className="h-auto bg-muted/60 py-2 text-center font-bold uppercase text-foreground">
                                    Rekap Pengaduan BPS Provinsi Riau
                                </TableHead>
                            </TableRow>
                            <TableRow className="hover:bg-transparent">
                                <TableHead colSpan={COLUMNS.length + 1} className="h-auto py-1 text-center font-semibold uppercase text-foreground">
                                    Bulan : {periodLabel}
                                </TableHead>
                            </TableRow>
                            <TableRow className="hover:bg-transparent">
                                <TableHead rowSpan={2} className="w-52 border-r text-center align-middle font-semibold text-foreground">
                                    Kanal
                                </TableHead>
                                <TableHead colSpan={2} className="border-r text-center font-semibold text-foreground">
                                    Pengaduan
                                </TableHead>
                                <TableHead rowSpan={2} className="border-r text-center align-middle font-semibold text-foreground">
                                    Aspirasi
                                </TableHead>
                                <TableHead rowSpan={2} className="border-r text-center align-middle font-semibold text-foreground">
                                    Permintaan Informasi
                                </TableHead>
                                <TableHead rowSpan={2} className="text-center align-middle font-semibold text-foreground">
                                    Jumlah
                                </TableHead>
                            </TableRow>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-center font-medium">
                                    Layanan PST
                                    <span className="block text-[10px] font-normal lowercase">(Pelayanan Statistik Terpadu)</span>
                                </TableHead>
                                <TableHead className="border-r text-center font-medium">Layanan Lainnya</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={COLUMNS.length + 1} className="py-10 text-center text-muted-foreground">
                                        Belum ada data untuk periode ini.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => <RekapRowFragment key={row.channel} row={row} />)
                            )}
                        </TableBody>

                        <TableFooter>
                            <TableRow className="bg-muted/60 hover:bg-muted/60">
                                <TableCell className="font-semibold uppercase">Total</TableCell>
                                {COLUMNS.map((column) => (
                                    <TableCell
                                        key={column.key}
                                        className={cn('text-center font-semibold tabular-nums', column.key === 'jumlah' && 'bg-muted')}
                                    >
                                        {totals[column.key]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </div>

            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Export PDF — Rekap Bulanan {periodLabel}</DialogTitle>
                        <DialogDescription>
                            Pratinjau di bawah adalah dokumen yang akan dicetak, lengkap dengan kop surat. Gunakan tombol Cetak lalu pilih
                            &ldquo;Save as PDF&rdquo; pada dialog printer untuk menyimpan berkas.
                        </DialogDescription>
                    </DialogHeader>

                    {exportOpen && (
                        <iframe
                            id="rekap-print-frame"
                            src={printUrl}
                            title={`Pratinjau rekap ${periodLabel}`}
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

function RekapRowFragment({ row }: { row: RekapRow }) {
    return (
        <>
            {/* Kanal induk tidak bisa dipilih saat input data, jadi barisnya
                selalu kosong dan ditandai abu-abu agar tidak diisi angka. */}
            <TableRow className="bg-muted/60 font-semibold text-muted-foreground hover:bg-muted/60">
                <TableCell className="border-r">{row.channel}</TableCell>
                {COLUMNS.map((column) => (
                    <TableCell
                        key={column.key}
                        className={cn('text-center tabular-nums', column.key === 'jumlah' && 'bg-muted/40 font-medium')}
                    >
                        {row[column.key]}
                    </TableCell>
                ))}
            </TableRow>

            {row.children.map((child) => (
                <TableRow key={`${row.channel}-${child.channel}`} className="hover:bg-muted/40">
                    <TableCell className="border-r pl-8 text-muted-foreground">{child.channel}</TableCell>
                    {COLUMNS.map((column) => (
                        <TableCell
                            key={column.key}
                            className={cn('text-center tabular-nums', column.key === 'jumlah' && 'bg-muted/40 font-medium')}
                        >
                            {child[column.key]}
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}
