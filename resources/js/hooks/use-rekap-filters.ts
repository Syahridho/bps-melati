import { REKAP_PRINT_FRAME_ID } from '@/lib/rekap-constants';
import { resolveRekapRolePrefix } from '@/lib/rekap-utils';
import { router } from '@inertiajs/react';
import { useCallback, useMemo, useState } from 'react';

interface UseRekapFiltersOptions {
    /** Prefix route tanpa titik, contoh: `rekap-bulanan`. */
    routeKey: string;
    /** Nama query periode, contoh: `period` / `semester` / `year`. */
    periodParam: string;
    /** Nilai periode aktif (dari props Inertia). */
    period: string;
    /** Id iframe pratinjau cetak; default dipakai halaman bulanan. */
    frameId?: string;
}

export function useRekapFilters({ routeKey, periodParam, period, frameId = REKAP_PRINT_FRAME_ID }: UseRekapFiltersOptions) {
    const [exportOpen, setExportOpen] = useState(false);

    const rolePrefix = useMemo(() => resolveRekapRolePrefix(), []);

    const printUrl = useMemo(
        () => `${route(`${rolePrefix}${routeKey}.print`)}?${periodParam}=${encodeURIComponent(period)}`,
        [rolePrefix, routeKey, periodParam, period],
    );

    const excelUrl = useMemo(
        () => `${route(`${rolePrefix}${routeKey}.excel`)}?${periodParam}=${encodeURIComponent(period)}`,
        [rolePrefix, routeKey, periodParam, period],
    );

    const handlePeriodChange = useCallback(
        (value: string) => {
            router.get(
                route(`${rolePrefix}${routeKey}.index`),
                { [periodParam]: value },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        },
        [rolePrefix, routeKey, periodParam],
    );

    const handlePrint = useCallback(() => {
        const frame = document.getElementById(frameId) as HTMLIFrameElement | null;
        frame?.contentWindow?.print();
    }, [frameId]);

    return {
        rolePrefix,
        printUrl,
        excelUrl,
        exportOpen,
        setExportOpen,
        handlePeriodChange,
        handlePrint,
    };
}
