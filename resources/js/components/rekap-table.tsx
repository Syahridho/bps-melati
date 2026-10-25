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
            <Table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
                <colgroup>
                    <col className="w-[30%]" />
                    {REKAP_COLUMNS.map((column) => (
                        <col key={column.key} className="w-[14%]" />
                    ))}
                </colgroup>

                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead colSpan={REKAP_COLUMNS.length + 1} className="bg-muted/60 text-foreground py-2 text-center text-sm font-medium uppercase">
                            Rekap Pengaduan BPS Provinsi Riau
                        </TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                        <TableHead colSpan={REKAP_COLUMNS.length + 1} className="text-foreground py-1.5 text-center text-sm font-medium uppercase">
                            Bulan : {periodLabel}
                        </TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                        <TableHead rowSpan={2} className="text-foreground border-r py-2 text-center align-middle text-sm font-medium">
                            Sumber Kanal
                        </TableHead>
                        <TableHead colSpan={2} className="text-foreground border-r py-1.5 text-center text-sm font-medium whitespace-nowrap">
                            Pengaduan
                        </TableHead>
                        <TableHead rowSpan={2} className="text-foreground border-r py-2 text-center align-middle text-sm font-medium whitespace-normal">
                            Aspirasi
                        </TableHead>
                        <TableHead rowSpan={2} className="text-foreground border-r py-2 text-center align-middle text-sm font-medium whitespace-normal">
                            Permintaan Informasi
                        </TableHead>
                        <TableHead rowSpan={2} className="text-foreground py-2 text-center align-middle text-sm font-medium whitespace-nowrap">
                            Jumlah
                        </TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="text-muted-foreground py-1 text-center text-xs font-normal whitespace-nowrap">PST</TableHead>
                        <TableHead className="text-muted-foreground border-r py-1 text-center text-xs font-normal whitespace-nowrap">NonPST</TableHead>
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
                        <TableCell className="text-foreground h-9 py-1.5 pr-4 pl-4 text-sm font-medium uppercase">Total</TableCell>
                        {REKAP_COLUMNS.map((column) => (
                            <TableCell
                                key={column.key}
                                className={cn(
                                    'h-9 py-1.5 text-center text-sm font-medium whitespace-nowrap tabular-nums',
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
                <TableCell
                    className={cn(
                        'min-h-9 border-r py-1.5 pr-4 pl-4 text-left text-sm break-words whitespace-normal',
                        hasChildren ? 'bg-muted/50 font-medium' : 'bg-card font-normal',
                    )}
                >
                    {row.channel}
                </TableCell>

                {hasChildren ? (
                    <TableCell colSpan={REKAP_COLUMNS.length} className="bg-muted/50 h-9 py-1.5" />
                ) : (
                    REKAP_COLUMNS.map((column) => (
                        <TableCell
                            key={column.key}
                            className={cn('h-9 py-1.5 text-center text-sm whitespace-nowrap tabular-nums', column.key === 'jumlah' && 'bg-muted/40 font-medium')}
                        >
                            {row[column.key]}
                        </TableCell>
                    ))
                )}
            </TableRow>

            {hasChildren &&
                row.children.map((child) => (
                    <TableRow key={`${row.channel}-${child.channel}`} className="hover:bg-muted/40">
                        <TableCell className="text-muted-foreground bg-card min-h-9 border-r py-1.5 pr-4 pl-8 text-left text-sm font-normal break-words whitespace-normal">
                            {child.channel.replace(/^-+\s*/, '')}
                        </TableCell>
                        {REKAP_COLUMNS.map((column) => (
                            <TableCell
                                key={column.key}
                                className={cn('h-9 py-1.5 text-center text-sm whitespace-nowrap tabular-nums', column.key === 'jumlah' && 'bg-muted/40 font-medium')}
                            >
                                {child[column.key]}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
        </>
    );
}