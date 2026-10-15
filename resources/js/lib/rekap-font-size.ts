export function getRekapTableFontSize(columnCount: number): {
    fontSize: string;
    thPadding: string;
    tdPadding: string;
} {
    if (columnCount <= 6) {
        return {
            fontSize: 'text-xs sm:text-sm',
            thPadding: 'px-2 py-2',
            tdPadding: 'px-2 py-1.5',
        };
    }
    if (columnCount <= 26) {
        return {
            fontSize: 'text-[10px] sm:text-[11px]',
            thPadding: 'px-1 py-1.5',
            tdPadding: 'px-1 py-1',
        };
    }
    return {
        fontSize: 'text-[7px] sm:text-[8.5px]',
        thPadding: 'px-0.5 py-1',
        tdPadding: 'px-0.5 py-0.5',
    };
}
