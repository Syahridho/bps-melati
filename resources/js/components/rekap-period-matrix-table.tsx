import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { REKAP_MATRIX_COLUMNS, REKAP_MATRIX_SUB_COLUMNS, REKAP_VIEW_MODE_DEFAULT, REKAP_VIEW_MODE_RINGKAS } from '@/lib/rekap-constants';
import { countFor, sumCounts, sumMonthCell } from '@/lib/rekap-utils';
import { cn } from '@/lib/utils';
import { type RekapMatrixPeriodColumn, type RekapMatrixRow, type RekapMatrixTotals, type RekapPeriodCounts, type RekapViewMode } from '@/types/rekap';

interface RekapPeriodMatrixTableProps {
    rows: RekapMatrixRow[];
    totals: RekapMatrixTotals;
    periods: RekapMatrixPeriodColumn[];
    /** `detail` = PST/Lain/Asp/Inf per bulan, `ringkas` = satu kolom jumlah per bulan. */
    viewMode?: RekapViewMode;
    /** Class pada wrapper tabel yang bisa digulir. */
    wrapperClassName?: string;
    /** Class pada elemen tabel. */
    tableClassName?: string;
    /** Class pada sel kosong saat tidak ada data. */
    emptyCellClassName?: string;
}

export function RekapPeriodMatrixTable({
    rows,
    totals,
    periods,
    viewMode = REKAP_VIEW_MODE_DEFAULT,
    wrapperClassName = 'max-h-[70vh] overflow-auto',
    tableClassName = 'min-w-[1100px] border-collapse text-[11px]',
    emptyCellClassName = 'text-muted-foreground h-24 text-center',
}: RekapPeriodMatrixTableProps) {
    const ringkas = viewMode === REKAP_VIEW_MODE_RINGKAS;
    const columnCount = ringkas ? 1 : REKAP_MATRIX_COLUMNS.length;

    return (
        <div className="bg-card overflow-hidden rounded-lg border">
            <div className={wrapperClassName}>
                <Table className={tableClassName}>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead
                                rowSpan={ringkas ? undefined : 2}
                                className="bg-muted after:bg-border sticky left-0 z-20 border-r after:absolute after:top-0 after:right-0 after:h-full after:w-px"
                            >
                                Sumber Kanal
                            </TableHead>
                            {periods.map((period) => (
                                <TableHead key={period.key} colSpan={columnCount} className="border-r text-center font-semibold">
                                    {period.label}
                                </TableHead>
                            ))}
                            <TableHead rowSpan={ringkas ? undefined : 2} className="text-center font-semibold">
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
                                                'text-muted-foreground after:bg-border text-center text-[10px] font-normal after:absolute after:top-0 after:right-0 after:h-full after:w-px',
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
                        <TableRow className="bg-muted/60 hover:bg-muted/60">
                            <TableCell className="bg-muted sticky left-0 z-10 border-r font-semibold">Total</TableCell>
                            {periods.map((period) =>
                                ringkas ? (
                                    <TableCell key={`${period.key}-sum`} className="border-r text-center font-medium tabular-nums">
                                        {sumCounts(totals[period.key] as RekapPeriodCounts | undefined)}
                                    </TableCell>
                                ) : (
                                    REKAP_MATRIX_COLUMNS.map((column, index) => (
                                        <TableCell
                                            key={`${period.key}-${column}`}
                                            className={cn('text-center font-medium tabular-nums', index === columnCount - 1 && 'border-r')}
                                        >
                                            {(totals[period.key] as RekapPeriodCounts | undefined)?.[column] ?? 0}
                                        </TableCell>
                                    ))
                                ),
                            )}
                            <TableCell className="text-center font-medium tabular-nums">{totals.jumlah}</TableCell>
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
            <TableRow className={cn(hasChildren ? 'bg-muted/60 hover:bg-muted/60 font-semibold' : 'hover:bg-muted/40')}>
                <TableCell className={cn('sticky left-0 z-10 border-r', hasChildren ? 'bg-muted' : 'bg-card')}>{row.channel}</TableCell>

                {hasChildren ? (
                    <TableCell colSpan={rightColSpan} className="bg-muted/60" />
                ) : (
                    <>
                        {periods.map((period) =>
                            ringkas ? (
                                <TableCell key={`${period.key}-sum`} className="border-r text-center tabular-nums">
                                    {sumMonthCell(row.perPeriod, period.key)}
                                </TableCell>
                            ) : (
                                REKAP_MATRIX_COLUMNS.map((column, index) => (
                                    <TableCell
                                        key={`${period.key}-${column}`}
                                        className={cn('text-center tabular-nums', index === columnCount - 1 && 'border-r')}
                                    >
                                        {countFor(row.perPeriod, period.key, column)}
                                    </TableCell>
                                ))
                            ),
                        )}
                        <TableCell className="text-center font-medium tabular-nums">{row.jumlah}</TableCell>
                    </>
                )}
            </TableRow>

            {hasChildren &&
                row.children.map((child) => (
                    <TableRow key={`${row.channel}-${child.channel}`} className="hover:bg-muted/40">
                        <TableCell className="bg-card text-muted-foreground sticky left-0 z-10 border-r pl-6">{child.channel}</TableCell>
                        {periods.map((period) =>
                            ringkas ? (
                                <TableCell key={`${period.key}-sum`} className="border-r text-center tabular-nums">
                                    {sumMonthCell(child.perPeriod, period.key)}
                                </TableCell>
                            ) : (
                                REKAP_MATRIX_COLUMNS.map((column, index) => (
                                    <TableCell
                                        key={`${period.key}-${column}`}
                                        className={cn('text-center tabular-nums', index === columnCount - 1 && 'border-r')}
                                    >
                                        {countFor(child.perPeriod, period.key, column)}
                                    </TableCell>
                                ))
                            ),
                        )}
                        <TableCell className="text-center font-medium tabular-nums">{child.jumlah}</TableCell>
                    </TableRow>
                ))}
        </>
    );
}
