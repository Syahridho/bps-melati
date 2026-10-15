import { generateExportFilename } from '@/lib/export-filename';
import { REKAP_PRINT_FRAME_ID, REKAP_VIEW_MODE_PARAM } from '@/lib/rekap-constants';
import { resolveRekapRolePrefix } from '@/lib/rekap-utils';
import { type RekapViewMode } from '@/types/rekap';
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
    /**
     * Mode tampilan rekap dari props Inertia. Bila diisi, mode ikut dibawa pada
     * navigasi dan URL export. Halaman tanpa mode (bulanan) biarkan undefined
     * supaya perilakunya sama seperti sebelumnya.
     */
    viewMode?: RekapViewMode;
    /** Prefix nama file export PDF. */
    exportPrefix: string;
    /** Periode string untuk nama file export PDF. */
    exportPeriode: string;
}

export function useRekapFilters({
    routeKey,
    periodParam,
    period,
    frameId = REKAP_PRINT_FRAME_ID,
    viewMode,
    exportPrefix,
    exportPeriode,
}: UseRekapFiltersOptions) {
    const [exportOpen, setExportOpen] = useState(false);

    const rolePrefix = useMemo(() => resolveRekapRolePrefix(), []);

    const queryString = useMemo(() => {
        const params = [`${periodParam}=${encodeURIComponent(period)}`];

        if (viewMode) {
            params.push(`${REKAP_VIEW_MODE_PARAM}=${encodeURIComponent(viewMode)}`);
        }

        return params.join('&');
    }, [periodParam, period, viewMode]);

    const printUrl = useMemo(() => `${route(`${rolePrefix}${routeKey}.print`)}?${queryString}`, [rolePrefix, routeKey, queryString]);

    const excelUrl = useMemo(() => `${route(`${rolePrefix}${routeKey}.excel`)}?${queryString}`, [rolePrefix, routeKey, queryString]);

    /**
     * Ganti periode atau mode tampilan tanpa kehilangan yang lain: setiap
     * navigasi selalu mengirim ulang periode dan mode yang sedang aktif.
     */
    const navigate = useCallback(
        (nextPeriod: string, nextViewMode?: RekapViewMode) => {
            router.get(
                route(`${rolePrefix}${routeKey}.index`),
                {
                    [periodParam]: nextPeriod,
                    ...((nextViewMode ?? viewMode) ? { [REKAP_VIEW_MODE_PARAM]: (nextViewMode ?? viewMode) as RekapViewMode } : {}),
                },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        },
        [rolePrefix, routeKey, periodParam, viewMode],
    );

    const handlePeriodChange = useCallback((value: string) => navigate(value), [navigate]);

    const handleViewModeChange = useCallback((value: RekapViewMode) => navigate(period, value), [navigate, period]);

    const handlePrint = useCallback(() => {
        const frame = document.getElementById(frameId) as HTMLIFrameElement | null;
        if (!frame || !frame.contentWindow || !frame.contentDocument) return;

        const filename = generateExportFilename(exportPrefix, exportPeriode);
        const iframeWin = frame.contentWindow;
        const iframeDoc = frame.contentDocument;

        const originalParentTitle = document.title;
        const originalIframeTitle = iframeDoc.title;

        document.title = filename;
        iframeDoc.title = filename;

        const restore = () => {
            document.title = originalParentTitle;
            if (iframeDoc) {
                iframeDoc.title = originalIframeTitle;
            }
            iframeWin.removeEventListener('afterprint', restore);
        };

        iframeWin.addEventListener('afterprint', restore);
        setTimeout(restore, 3000);

        iframeWin.print();
    }, [frameId, exportPrefix, exportPeriode]);

    return {
        rolePrefix,
        viewMode,
        printUrl,
        excelUrl,
        exportOpen,
        setExportOpen,
        handlePeriodChange,
        handleViewModeChange,
        handlePrint,
    };
}
