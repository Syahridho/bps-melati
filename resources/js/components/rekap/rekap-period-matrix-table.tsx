import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { REKAP_MATRIX_COLUMNS, REKAP_MATRIX_SUB_COLUMNS, REKAP_VIEW_MODE_DEFAULT, REKAP_VIEW_MODE_RINGKAS } from '@/lib/rekap-constants';
import { countFor, sumCounts, sumMonthCell } from '@/lib/rekap-utils';
import { cn } from '@/lib/utils';
import { type RekapMatrixPeriodColumn, type RekapMatrixRow, type RekapMatrixTotals, type RekapPeriodCounts, type RekapViewMode } from '@/types/rekap';
interface RekapPeriodMatrixTableProps {
    rows: RekapMatrixRow[];
    totals: RekapMatrixTotals;
    periods: RekapMatrixPeriodColumn[];
    viewMode?: RekapViewMode;
    wrapperClassName?: string;
    tableClassName?: string;
    emptyCellClassName?: string;
    periodLabel: any;
}

export function RekapPeriodMatrixTable({
    rows,
    totals,
    periods,
    periodLabel,
    viewMode = REKAP_VIEW_MODE_DEFAULT,
    wrapperClassName = 'overflow-x-auto rounded-md border bg-card',
    tableClassName = 'w-full border-collapse text-sm',
    emptyCellClassName = 'text-muted-foreground h-24 text-center',
}: RekapPeriodMatrixTableProps) {
    const ringkas = viewMode === REKAP_VIEW_MODE_RINGKAS;
    const columnCount = ringkas ? 1 : REKAP_MATRIX_COLUMNS.length;
    const totalColumns = periods.length * columnCount + 2;
    return (
        <div className="bg-card overflow-hidden rounded-md border">
            <div className={wrapperClassName}>
                <Table className={tableClassName}>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead colSpan={totalColumns} className="bg-muted/60 text-foreground py-2 text-center text-sm font-medium uppercase">
                                Rekap Pengaduan BPS Provinsi Riau
                            </TableHead>
                        </TableRow>
                        <TableRow className="hover:bg-transparent">
                            <TableHead
                                colSpan={totalColumns}
                                className="bg-muted/60 text-foreground py-1.5 text-center text-sm font-medium uppercase"
                            >
                                {periodLabel}
                            </TableHead>
                        </TableRow>
                        <TableRow className="hover:bg-transparent">
                            <TableHead
                                rowSpan={ringkas ? undefined : 2}
                                className="text-foreground sticky left-0 z-20 min-w-[220px] border-r border-b bg-white px-4 py-2 text-center text-sm font-medium"
                            >
                                Sumber Kanal
                            </TableHead>
                            {periods.map((period) => (
                                <TableHead
                                    key={period.key}
                                    colSpan={columnCount}
                                    className="text-foreground border-r border-b py-2 text-center text-sm font-medium"
                                >
                                    {period.label}
                                </TableHead>
                            ))}
                            <TableHead
                                rowSpan={ringkas ? undefined : 2}
                                className="bg-muted text-foreground border-b py-2 text-center text-sm font-medium"
                            >
                                Jumlah
                            </TableHead>
                        </TableRow>
                        {!ringkas && (
                            <TableRow className="hover:bg-transparent">
                                {periods.map((period) =>
                                    REKAP_MATRIX_SUB_COLUMNS.map((sub, index) => (
                                        <TableHead
                                            key={`${period.key}-${sub}`}
                                            className={cn(
                                                'text-muted-foreground border-b py-1.5 text-center text-xs font-normal',
                                                index === columnCount - 1 && 'border-r',
                                            )}
                                        >
                                            {sub}
                                        </TableHead>
                                    )),
                                )}
                            </TableRow>
                        )}
                    </TableHeader>

                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={periods.length * columnCount + 2} className={emptyCellClassName}>
                                    Belum ada data untuk periode ini.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => (
                                <RekapMatrixRowFragment key={row.channel} row={row} periods={periods} columnCount={columnCount} ringkas={ringkas} />
                            ))
                        )}
                    </TableBody>

                    <TableFooter>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableCell className="bg-muted text-foreground sticky left-0 z-10 h-9 border-r py-1.5 pl-4 text-sm font-medium uppercase">
                                Total
                            </TableCell>
                            {periods.map((period) =>
                                ringkas ? (
                                    <TableCell
                                        key={`${period.key}-sum`}
                                        className="h-9 border-r py-1.5 text-center text-sm font-medium whitespace-nowrap tabular-nums"
                                    >
                                        {sumCounts(totals[period.key] as RekapPeriodCounts | undefined)}
                                    </TableCell>
                                ) : (
                                    REKAP_MATRIX_COLUMNS.map((column, index) => (
                                        <TableCell
                                            key={`${period.key}-${column}`}
                                            className={cn(
                                                'h-9 py-1.5 text-center text-sm font-medium whitespace-nowrap tabular-nums',
                                                index === columnCount - 1 && 'border-r',
                                            )}
                                        >
                                            {(totals[period.key] as RekapPeriodCounts | undefined)?.[column] ?? 0}
                                        </TableCell>
                                    ))
                                ),
                            )}
                            <TableCell className="h-9 py-1.5 text-center text-sm font-medium whitespace-nowrap tabular-nums">
                                {totals.jumlah}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}

function RekapMatrixRowFragment({
    row,
    periods,
    columnCount,
    ringkas,
}: {
    row: RekapMatrixRow;
    periods: RekapMatrixPeriodColumn[];
    columnCount: number;
    ringkas: boolean;
}) {
    const hasChildren = row.children && row.children.length > 0;
    const rightColSpan = periods.length * columnCount + 1;

    return (
        <>
            <TableRow className={cn(hasChildren ? 'bg-muted/50 font-medium' : 'hover:bg-muted/40')}>
                <TableCell
                    className={cn(
                        'sticky left-0 z-10 h-9 min-w-[220px] border-r py-1.5 pl-4 text-sm whitespace-nowrap',
                        hasChildren ? 'bg-muted/50 font-medium' : 'bg-card font-normal',
                    )}
                >
                    {row.channel}
                </TableCell>

                {hasChildren ? (
                    <TableCell colSpan={rightColSpan} className="bg-muted/50 h-9 py-1.5" />
                ) : (
                    <>
                        {periods.map((period) =>
                            ringkas ? (
                                <TableCell
                                    key={`${period.key}-sum`}
                                    className="h-9 border-r py-1.5 text-center text-sm whitespace-nowrap tabular-nums"
                                >
                                    {sumMonthCell(row.perPeriod, period.key)}
                                </TableCell>
                            ) : (
                                REKAP_MATRIX_COLUMNS.map((column, index) => (
                                    <TableCell
                                        key={`${period.key}-${column}`}
                                        className={cn(
                                            'h-9 py-1.5 text-center text-sm whitespace-nowrap tabular-nums',
                                            index === columnCount - 1 && 'border-r',
                                        )}
                                    >
                                        {countFor(row.perPeriod, period.key, column)}
                                    </TableCell>
                                ))
                            ),
                        )}
                        <TableCell className="h-9 py-1.5 text-center text-sm font-medium whitespace-nowrap tabular-nums">{row.jumlah}</TableCell>
                    </>
                )}
            </TableRow>

            {hasChildren &&
                row.children.map((child) => (
                    <TableRow key={`${row.channel}-${child.channel}`} className="hover:bg-muted/40">
                        <TableCell className="text-muted-foreground bg-card sticky left-0 z-10 h-9 min-w-[220px] border-r py-1.5 pl-8 text-sm font-normal whitespace-nowrap">
                            {child.channel.replace(/^-+\s*/, '')}
                        </TableCell>
                        {periods.map((period) =>
                            ringkas ? (
                                <TableCell
                                    key={`${period.key}-sum`}
                                    className="h-9 border-r py-1.5 text-center text-sm whitespace-nowrap tabular-nums"
                                >
                                    {sumMonthCell(child.perPeriod, period.key)}
                                </TableCell>
                            ) : (
                                REKAP_MATRIX_COLUMNS.map((column, index) => (
                                    <TableCell
                                        key={`${period.key}-${column}`}
                                        className={cn(
                                            'h-9 py-1.5 text-center text-sm whitespace-nowrap tabular-nums',
                                            index === columnCount - 1 && 'border-r',
                                        )}
                                    >
                                        {countFor(child.perPeriod, period.key, column)}
                                    </TableCell>
                                ))
                            ),
                        )}
                        <TableCell className="h-9 py-1.5 text-center text-sm font-medium whitespace-nowrap tabular-nums">{child.jumlah}</TableCell>
                    </TableRow>
                ))}
        </>
    );
}
