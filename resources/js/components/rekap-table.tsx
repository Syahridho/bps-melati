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
        <div className="bg-card overflow-hidden rounded-md border">
            <Table className="w-full table-fixed border-collapse text-sm">
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead colSpan={REKAP_COLUMNS.length + 1} className="bg-muted/60 text-foreground text-center font-medium uppercase py-2 text-sm">
                            Rekap Pengaduan BPS Provinsi Riau
                        </TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                        <TableHead colSpan={REKAP_COLUMNS.length + 1} className="text-foreground text-center font-medium uppercase py-1.5 text-sm">
                            Bulan : {periodLabel}
                        </TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                        <TableHead rowSpan={2} className="text-foreground min-w-[220px] border-r text-center align-middle font-medium whitespace-nowrap py-2 text-sm">
                            Sumber Kanal
                        </TableHead>
                        <TableHead colSpan={2} className="text-foreground border-r text-center font-medium whitespace-nowrap py-1.5 text-sm">
                            Pengaduan
                        </TableHead>
                        <TableHead rowSpan={2} className="text-foreground border-r text-center align-middle font-medium whitespace-nowrap py-2 text-sm">
                            Aspirasi
                        </TableHead>
                        <TableHead rowSpan={2} className="text-foreground border-r text-center align-middle font-medium whitespace-nowrap py-2 text-sm">
                            Permintaan Informasi
                        </TableHead>
                        <TableHead rowSpan={2} className="text-foreground text-center align-middle font-medium whitespace-nowrap py-2 text-sm">
                            Jumlah
                        </TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="text-center font-normal text-xs text-muted-foreground whitespace-nowrap py-1">
                            PST
                        </TableHead>
                        <TableHead className="border-r text-center font-normal text-xs text-muted-foreground whitespace-nowrap py-1">
                            Lainnya
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={REKAP_COLUMNS.length + 1} className="text-muted-foreground py-10 text-center text-sm">
                                Belum ada data untuk periode ini.
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((row) => <RekapTableRow key={row.channel} row={row} />)
                    )}
                </TableBody>

                <TableFooter>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell className="text-foreground pl-4 font-medium uppercase whitespace-nowrap h-9 py-1.5 text-sm">Total</TableCell>
                        {REKAP_COLUMNS.map((column) => (
                            <TableCell
                                key={column.key}
                                className={cn(
                                    'text-center font-medium tabular-nums whitespace-nowrap h-9 py-1.5 text-sm',
                                    column.key === 'jumlah' && 'bg-muted/60',
                                )}
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
    const hasChildren = row.children && row.children.length > 0;

    return (
        <>
            <TableRow className={cn(hasChildren ? 'bg-muted/50 font-medium' : 'hover:bg-muted/40')}>
                <TableCell className={cn('border-r pl-4 text-left whitespace-nowrap h-9 py-1.5 text-sm', hasChildren ? 'bg-muted/50 font-medium' : 'bg-card font-normal')}>
                    {row.channel}
                </TableCell>

                {hasChildren ? (
                    <TableCell colSpan={REKAP_COLUMNS.length} className="bg-muted/50 h-9 py-1.5" />
                ) : (
                    REKAP_COLUMNS.map((column) => (
                        <TableCell
                            key={column.key}
                            className={cn('h-9 py-1.5 text-center tabular-nums whitespace-nowrap text-sm', column.key === 'jumlah' && 'bg-muted/40 font-medium')}
                        >
                            {row[column.key]}
                        </TableCell>
                    ))
                )}
            </TableRow>

            {hasChildren &&
                row.children.map((child) => (
                    <TableRow key={`${row.channel}-${child.channel}`} className="hover:bg-muted/40">
                        <TableCell className="text-muted-foreground border-r bg-card pl-8 text-left font-normal whitespace-nowrap h-9 py-1.5 text-sm">
                            {child.channel.replace(/^-+\s*/, '')}
                        </TableCell>
                        {REKAP_COLUMNS.map((column) => (
                            <TableCell
                                key={column.key}
                                className={cn('h-9 py-1.5 text-center tabular-nums whitespace-nowrap text-sm', column.key === 'jumlah' && 'bg-muted/40 font-medium')}
                            >
                                {child[column.key]}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
        </>
    );
}
