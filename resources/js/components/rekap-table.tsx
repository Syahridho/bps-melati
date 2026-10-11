import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { REKAP_COLUMNS } from '@/lib/rekap-constants';
import { cn } from '@/lib/utils';
import { type RekapRow, type RekapTotals } from '@/types/rekap';

interface RekapTableProps {
    rows: RekapRow[];
    totals: RekapTotals;
    periodLabel: string;
}

export function RekapTable({ rows, totals, periodLabel }: RekapTableProps) {
    return (
        <div className="bg-card overflow-hidden rounded-lg border">
            <Table className="border-collapse text-xs sm:text-sm">
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead
                            colSpan={REKAP_COLUMNS.length + 1}
                            className="bg-muted/60 text-foreground h-auto py-2 text-center font-bold uppercase"
                        >
                            Rekap Pengaduan BPS Provinsi Riau
                        </TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                        <TableHead colSpan={REKAP_COLUMNS.length + 1} className="text-foreground h-auto py-1 text-center font-semibold uppercase">
                            Bulan : {periodLabel}
                        </TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                        <TableHead rowSpan={2} className="text-foreground w-52 border-r text-center align-middle font-semibold">
                            Sumber Kanal
                        </TableHead>
                        <TableHead colSpan={2} className="text-foreground border-r text-center font-semibold">
                            Pengaduan
                        </TableHead>
                        <TableHead rowSpan={2} className="text-foreground border-r text-center align-middle font-semibold">
                            Aspirasi
                        </TableHead>
                        <TableHead rowSpan={2} className="text-foreground border-r text-center align-middle font-semibold">
                            Permintaan Informasi
                        </TableHead>
                        <TableHead rowSpan={2} className="text-foreground text-center align-middle font-semibold">
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
                            <TableCell colSpan={REKAP_COLUMNS.length + 1} className="text-muted-foreground py-10 text-center">
                                Belum ada data untuk periode ini.
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row) => <RekapTableRow key={row.channel} row={row} />)
                    )}
                </TableBody>

                <TableFooter>
                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                        <TableCell className="font-semibold uppercase">Total</TableCell>
                        {REKAP_COLUMNS.map((column) => (
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
    );
}

function RekapTableRow({ row }: { row: RekapRow }) {
    // Hanya anggap sebagai parent jika benar-benar memiliki children/cabang
    const hasChildren = row.children && row.children.length > 0;

    return (
        <>
            <TableRow className={cn(hasChildren ? 'bg-muted/60 font-semibold' : 'hover:bg-muted/40')}>
                <TableCell className="border-r">{row.channel}</TableCell>

                {hasChildren ? (
                    <TableCell colSpan={REKAP_COLUMNS.length} className="bg-muted/60" />
                ) : (
                    REKAP_COLUMNS.map((column) => (
                        <TableCell key={column.key} className={cn('text-center tabular-nums', column.key === 'jumlah' && 'bg-muted/40 font-medium')}>
                            {row[column.key]}
                        </TableCell>
                    ))
                )}
            </TableRow>

            {hasChildren &&
                row.children.map((child) => (
                    <TableRow key={`${row.channel}-${child.channel}`} className="hover:bg-muted/40">
                        <TableCell className="text-muted-foreground border-r pl-8">{child.channel}</TableCell>
                        {REKAP_COLUMNS.map((column) => (
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
