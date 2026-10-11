import { REKAP_MATRIX_COLUMNS, REKAP_MATRIX_SUB_COLUMNS, REKAP_VIEW_MODE_DEFAULT, REKAP_VIEW_MODE_RINGKAS } from '@/lib/rekap-constants';
import { countFor, sumCounts, sumMonthCell } from '@/lib/rekap-utils';
import { cn } from '@/lib/utils';
import { type RekapMatrixPeriodColumn, type RekapMatrixRow, type RekapMatrixTotals, type RekapPeriodCounts, type RekapViewMode } from '@/types/rekap';

/** Lebar kolom tetap (px) supaya tabel tidak "ngambang" melebar acak. */
const KANAL_COL_WIDTH = 176;
const DATA_COL_WIDTH = 44;
/** Kolom ringkas hanya satu per bulan, jadi boleh lebih lebar. */
const SUMMARY_DATA_COL_WIDTH = 72;
const JUMLAH_COL_WIDTH = 68;

interface RekapFixedMatrixTableProps {
    rows: RekapMatrixRow[];
    totals: RekapMatrixTotals;
    periods: RekapMatrixPeriodColumn[];
    /** `detail` = PST/Lain/Asp/Inf per bulan, `ringkas` = satu kolom jumlah per bulan. */
    viewMode?: RekapViewMode;
}

/**
 * min-w-0 di setiap level pembungkus mencegah tabel lebar memaksa seluruh
 * halaman melebar (bug flexbox: item flex defaultnya min-width:auto),
 * supaya scrollbar horizontal muncul tepat di bawah tabel, bukan di bawah halaman.
 */
export function RekapFixedMatrixTable({ rows, totals, periods, viewMode = REKAP_VIEW_MODE_DEFAULT }: RekapFixedMatrixTableProps) {
    const ringkas = viewMode === REKAP_VIEW_MODE_RINGKAS;
    const dataColWidth = ringkas ? SUMMARY_DATA_COL_WIDTH : DATA_COL_WIDTH;

    return (
        <div className="bg-card min-w-0 overflow-hidden rounded-lg border">
            <div className="max-h-[70vh] min-w-0 overflow-auto">
                <table className="w-full table-fixed border-separate border-spacing-0 text-[11px]">
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
                                className="bg-muted sticky left-0 z-40 border-r border-b px-2 py-2 text-left align-middle font-semibold"
                            >
                                Sumber Kanal
                            </th>
                            {periods.map((period, periodIndex) => (
                                <th
                                    key={period.key}
                                    colSpan={ringkas ? undefined : REKAP_MATRIX_COLUMNS.length}
                                    className={cn(
                                        'bg-muted border-b py-1.5 text-center font-semibold',
                                        periodIndex % 2 === 1 && 'bg-muted/70',
                                        'border-r-border border-r-2',
                                    )}
                                >
                                    {period.label}
                                </th>
                            ))}
                            <th rowSpan={ringkas ? undefined : 2} className="bg-muted border-b py-2 text-center align-middle font-semibold">
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
                                                'text-muted-foreground border-b py-1 text-center text-[10px] font-normal',
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
                                    className="text-muted-foreground h-24 text-center"
                                >
                                    Belum ada data untuk periode ini.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => <FixedMatrixRow key={row.channel} row={row} periods={periods} ringkas={ringkas} />)
                        )}
                    </tbody>

                    <tfoot>
                        <tr className="bg-muted/80">
                            <td className="bg-muted sticky left-0 z-10 border-r font-semibold">Total</td>
                            {periods.map((period, periodIndex) =>
                                ringkas ? (
                                    <td
                                        key={`${period.key}-sum`}
                                        className={cn(
                                            'border-t py-1.5 text-center font-medium tabular-nums',
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
                                                'border-t py-1.5 text-center font-medium tabular-nums',
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
                            <td className="border-t py-1.5 text-center font-semibold tabular-nums">{totals.jumlah}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

function FixedMatrixRow({ row, periods, ringkas }: { row: RekapMatrixRow; periods: RekapMatrixPeriodColumn[]; ringkas: boolean }) {
    const hasChildren = row.children && row.children.length > 0;
    const columnCount = ringkas ? 1 : REKAP_MATRIX_COLUMNS.length;
    const rightColSpan = periods.length * columnCount + 1;

    return (
        <>
            <tr className={cn(hasChildren ? 'bg-muted/50 font-semibold' : 'hover:bg-muted/30')}>
                <td className={cn('sticky left-0 z-10 border-r border-b px-2 py-1.5', hasChildren ? 'bg-muted/50' : 'bg-card')}>{row.channel}</td>

                {hasChildren ? (
                    <td colSpan={rightColSpan} className="bg-muted/50 border-b" />
                ) : (
                    <>
                        {periods.map((period, periodIndex) =>
                            ringkas ? (
                                <td
                                    key={`${period.key}-sum`}
                                    className={cn(
                                        'border-b py-1.5 text-center tabular-nums',
                                        'border-r-border border-r-2',
                                        periodIndex % 2 === 1 && 'bg-muted/20',
                                    )}
                                >
                                    {sumMonthCell(row.perPeriod, period.key)}
                                </td>
                            ) : (
                                REKAP_MATRIX_COLUMNS.map((column, index) => (
                                    <td
                                        key={`${period.key}-${column}`}
                                        className={cn(
                                            'border-b py-1.5 text-center tabular-nums',
                                            index === columnCount - 1 ? 'border-r-border border-r-2' : 'border-r-border/40 border-r',
                                            periodIndex % 2 === 1 && 'bg-muted/20',
                                        )}
                                    >
                                        {countFor(row.perPeriod, period.key, column)}
                                    </td>
                                ))
                            ),
                        )}
                        <td className="border-b py-1.5 text-center font-medium tabular-nums">{row.jumlah}</td>
                    </>
                )}
            </tr>

            {hasChildren &&
                row.children.map((child) => (
                    <tr key={`${row.channel}-${child.channel}`} className="hover:bg-muted/30">
                        <td className="bg-card text-muted-foreground sticky left-0 z-10 border-r border-b py-1.5 pr-2 pl-6">{child.channel}</td>
                        {periods.map((period, periodIndex) =>
                            ringkas ? (
                                <td
                                    key={`${period.key}-sum`}
                                    className={cn(
                                        'border-b py-1.5 text-center tabular-nums',
                                        'border-r-border border-r-2',
                                        periodIndex % 2 === 1 && 'bg-muted/20',
                                    )}
                                >
                                    {sumMonthCell(child.perPeriod, period.key)}
                                </td>
                            ) : (
                                REKAP_MATRIX_COLUMNS.map((column, index) => (
                                    <td
                                        key={`${period.key}-${column}`}
                                        className={cn(
                                            'border-b py-1.5 text-center tabular-nums',
                                            index === columnCount - 1 ? 'border-r-border border-r-2' : 'border-r-border/40 border-r',
                                            periodIndex % 2 === 1 && 'bg-muted/20',
                                        )}
                                    >
                                        {countFor(child.perPeriod, period.key, column)}
                                    </td>
                                ))
                            ),
                        )}
                        <td className="border-b py-1.5 text-center font-medium tabular-nums">{child.jumlah}</td>
                    </tr>
                ))}
        </>
    );
}
