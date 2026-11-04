import { REKAP_MATRIX_COLUMNS, REKAP_MATRIX_SUB_COLUMNS, REKAP_VIEW_MODE_DEFAULT, REKAP_VIEW_MODE_RINGKAS } from '@/lib/rekap-constants';
import { countFor, sumCounts, sumMonthCell } from '@/lib/rekap-utils';
import { cn } from '@/lib/utils';
import { type RekapMatrixPeriodColumn, type RekapMatrixRow, type RekapMatrixTotals, type RekapPeriodCounts, type RekapViewMode } from '@/types/rekap';

const KANAL_COL_WIDTH = 220;
const DATA_COL_WIDTH = 48;
const SUMMARY_DATA_COL_WIDTH = 76;
const JUMLAH_COL_WIDTH = 76;

interface RekapFixedMatrixTableProps {
    rows: RekapMatrixRow[];
    totals: RekapMatrixTotals;
    periods: RekapMatrixPeriodColumn[];
    viewMode?: RekapViewMode;
}

export function RekapFixedMatrixTable({ rows, totals, periods, viewMode = REKAP_VIEW_MODE_DEFAULT }: RekapFixedMatrixTableProps) {
    const ringkas = viewMode === REKAP_VIEW_MODE_RINGKAS;
    const dataColWidth = ringkas ? SUMMARY_DATA_COL_WIDTH : DATA_COL_WIDTH;

    return (
        <div className="bg-card min-w-0 overflow-hidden rounded-md border">
            <div className="overflow-x-auto min-w-0">
                <table className="w-full table-fixed border-collapse text-sm">
                    <colgroup>
                        <col style={{ width: KANAL_COL_WIDTH }} />
                        {periods.map((period) =>
                            ringkas ? (
                                <col key={`${period.key}-sum-col`} style={{ width: dataColWidth }} />
                            ) : (
                                REKAP_MATRIX_COLUMNS.map((column) => <col key={`${period.key}-${column}-col`} style={{ width: dataColWidth }} />)
                            ),
                        )}
                        <col style={{ width: JUMLAH_COL_WIDTH }} />
                    </colgroup>

                    <thead className="sticky top-0 z-30">
                        <tr>
                            <th
                                rowSpan={ringkas ? undefined : 2}
                                className="bg-muted text-foreground sticky left-0 z-40 border-r border-b px-4 py-2 text-left font-medium text-sm"
                            >
                                Sumber Kanal
                            </th>
                            {periods.map((period, periodIndex) => (
                                <th
                                    key={period.key}
                                    colSpan={ringkas ? undefined : REKAP_MATRIX_COLUMNS.length}
                                    className={cn(
                                        'bg-muted text-foreground border-b py-2 text-center font-medium text-sm',
                                        periodIndex % 2 === 1 && 'bg-muted/70',
                                        'border-r-border border-r-2',
                                    )}
                                >
                                    {period.label}
                                </th>
                            ))}
                            <th rowSpan={ringkas ? undefined : 2} className="bg-muted text-foreground border-b py-2 text-center font-medium text-sm">
                                Jumlah
                            </th>
                        </tr>
                        {!ringkas && (
                            <tr>
                                {periods.map((period, periodIndex) =>
                                    REKAP_MATRIX_SUB_COLUMNS.map((sub, subIndex) => (
                                        <th
                                            key={`${period.key}-${sub}`}
                                            className={cn(
                                                'text-muted-foreground border-b py-1.5 text-center text-xs font-normal',
                                                periodIndex % 2 === 1 ? 'bg-muted/70' : 'bg-muted',
                                                subIndex === REKAP_MATRIX_COLUMNS.length - 1
                                                    ? 'border-r-border border-r-2'
                                                    : 'border-r-border/40 border-r',
                                            )}
                                        >
                                            {sub}
                                        </th>
                                    )),
                                )}
                            </tr>
                        )}
                    </thead>

                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={periods.length * (ringkas ? 1 : REKAP_MATRIX_COLUMNS.length) + 2}
                                    className="text-muted-foreground h-24 text-center text-sm"
                                >
                                    Belum ada data untuk periode ini.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => <FixedMatrixRow key={row.channel} row={row} periods={periods} ringkas={ringkas} />)
                        )}
                    </tbody>

                    <tfoot>
                        <tr className="bg-muted/50 hover:bg-muted/50">
                            <td className="bg-muted text-foreground sticky left-0 z-10 border-r pl-4 font-medium uppercase h-9 py-1.5 text-sm">Total</td>
                            {periods.map((period, periodIndex) =>
                                ringkas ? (
                                    <td
                                        key={`${period.key}-sum`}
                                        className={cn(
                                            'border-t h-9 py-1.5 text-center font-medium tabular-nums whitespace-nowrap text-sm',
                                            'border-r-border border-r-2',
                                            periodIndex % 2 === 1 && 'bg-muted/70',
                                        )}
                                    >
                                        {sumCounts(totals[period.key] as RekapPeriodCounts | undefined)}
                                    </td>
                                ) : (
                                    REKAP_MATRIX_COLUMNS.map((column, index) => (
                                        <td
                                            key={`${period.key}-${column}`}
                                            className={cn(
                                                'border-t h-9 py-1.5 text-center font-medium tabular-nums whitespace-nowrap text-sm',
                                                index === REKAP_MATRIX_COLUMNS.length - 1
                                                    ? 'border-r-border border-r-2'
                                                    : 'border-r-border/40 border-r',
                                                periodIndex % 2 === 1 && 'bg-muted/70',
                                            )}
                                        >
                                            {(totals[period.key] as RekapPeriodCounts | undefined)?.[column] ?? 0}
                                        </td>
                                    ))
                                ),
                            )}
                            <td className="border-t h-9 py-1.5 text-center font-medium tabular-nums whitespace-nowrap text-sm">{totals.jumlah}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

function FixedMatrixRow({ row, periods, ringkas }: { row: RekapMatrixRow; periods: RekapMatrixPeriodColumn[]; ringkas: boolean }) {
    const hasChildren = row.children && row.children.length > 0;

    return (
        <>
            <tr className={cn(hasChildren ? 'bg-muted/50 font-medium' : 'hover:bg-muted/40')}>
                <td
                    className={cn(
                        'sticky left-0 z-10 border-r border-b pl-4 whitespace-nowrap h-9 py-1.5 text-sm',
                        hasChildren ? 'bg-muted/50 font-medium' : 'bg-card font-normal',
                    )}
                >
                    {row.channel}
                </td>

                {hasChildren ? (
                    <td colSpan={periods.length * (ringkas ? 1 : REKAP_MATRIX_COLUMNS.length) + 1} className="bg-muted/50 border-b h-9 py-1.5" />
                ) : (
                    <>
                        {periods.map((period, periodIndex) =>
                            ringkas ? (
                                <td
                                    key={`${period.key}-sum`}
                                    className={cn(
                                        'h-9 py-1.5 border-r border-b text-center tabular-nums whitespace-nowrap text-sm',
                                        'border-r-border border-r-2',
                                        periodIndex % 2 === 1 && 'bg-muted/20',
                                    )}
                                >
                                    {sumMonthCell(row.perPeriod, period.key)}
                                </td>
                            ) : (
                                REKAP_MATRIX_COLUMNS.map((column, subIndex) => (
                                    <td
                                        key={`${period.key}-${column}`}
                                        className={cn(
                                            'h-9 py-1.5 border-b text-center tabular-nums whitespace-nowrap text-sm',
                                            subIndex === REKAP_MATRIX_COLUMNS.length - 1
                                                ? 'border-r-border border-r-2'
                                                : 'border-r-border/40 border-r',
                                            periodIndex % 2 === 1 && 'bg-muted/20',
                                        )}
                                    >
                                        {countFor(row.perPeriod, period.key, column)}
                                    </td>
                                ))
                            ),
                        )}
                        <td className="h-9 py-1.5 border-b text-center font-medium tabular-nums whitespace-nowrap text-sm">{row.jumlah}</td>
                    </>
                )}
            </tr>

            {hasChildren &&
                row.children.map((child) => (
                    <tr key={`${row.channel}-${child.channel}`} className="hover:bg-muted/40">
                        <td className="text-muted-foreground sticky left-0 z-10 border-r border-b bg-card pl-8 font-normal whitespace-nowrap h-9 py-1.5 text-sm">
                            {child.channel.replace(/^-+\s*/, '')}
                        </td>
                        {periods.map((period, periodIndex) =>
                            ringkas ? (
                                <td
                                    key={`${period.key}-sum`}
                                    className={cn(
                                        'h-9 py-1.5 border-r border-b text-center tabular-nums whitespace-nowrap text-sm',
                                        'border-r-border border-r-2',
                                        periodIndex % 2 === 1 && 'bg-muted/20',
                                    )}
                                >
                                    {sumMonthCell(child.perPeriod, period.key)}
                                </td>
                            ) : (
                                REKAP_MATRIX_COLUMNS.map((column, subIndex) => (
                                    <td
                                        key={`${period.key}-${column}`}
                                        className={cn(
                                            'h-9 py-1.5 border-b text-center tabular-nums whitespace-nowrap text-sm',
                                            subIndex === REKAP_MATRIX_COLUMNS.length - 1
                                                ? 'border-r-border border-r-2'
                                                : 'border-r-border/40 border-r',
                                            periodIndex % 2 === 1 && 'bg-muted/20',
                                        )}
                                    >
                                        {countFor(child.perPeriod, period.key, column)}
                                    </td>
                                ))
                            ),
                        )}
                        <td className="h-9 py-1.5 border-b text-center font-medium tabular-nums whitespace-nowrap text-sm">{child.jumlah}</td>
                    </tr>
                ))}
        </>
    );
}
