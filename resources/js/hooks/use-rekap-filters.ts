import { generateExportFilename } from '@/lib/export-filename';
import { REKAP_PRINT_FRAME_ID, REKAP_VIEW_MODE_PARAM } from '@/lib/rekap-constants';
import { resolveRekapRolePrefix } from '@/lib/rekap-utils';
import { type RekapViewMode } from '@/types/rekap';
import { router } from '@inertiajs/react';
import { useCallback, useMemo, useState } from 'react';

interface UseRekapFiltersOptions {
    routeKey: string;
    queryParams: Record<string, string | number>;
    frameId?: string;
    viewMode?: RekapViewMode;
    exportPrefix: string;
    exportPeriode: string;
}

export function useRekapFilters({
    routeKey,
    queryParams,
    frameId = REKAP_PRINT_FRAME_ID,
    viewMode,
    exportPrefix,
    exportPeriode,
}: UseRekapFiltersOptions) {
    const [exportOpen, setExportOpen] = useState(false);

    const rolePrefix = useMemo(() => resolveRekapRolePrefix(), []);

    const queryString = useMemo(() => {
        const params = new URLSearchParams();

        Object.entries(queryParams).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
                params.append(key, String(val));
            }
        });

        if (viewMode) {
            params.append(REKAP_VIEW_MODE_PARAM, viewMode);
        }

        return params.toString();
    }, [queryParams, viewMode]);

    const printUrl = useMemo(() => `${route(`${rolePrefix}${routeKey}.print`)}?${queryString}`, [rolePrefix, routeKey, queryString]);

    const excelUrl = useMemo(() => `${route(`${rolePrefix}${routeKey}.excel`)}?${queryString}`, [rolePrefix, routeKey, queryString]);

    const navigate = useCallback(
        (nextParams: Record<string, string | number>, nextViewMode?: RekapViewMode) => {
            router.get(
                route(`${rolePrefix}${routeKey}.index`),
                {
                    ...queryParams,
                    ...nextParams,
                    ...((nextViewMode ?? viewMode) ? { [REKAP_VIEW_MODE_PARAM]: (nextViewMode ?? viewMode) as RekapViewMode } : {}),
                },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        },
        [rolePrefix, routeKey, queryParams, viewMode],
    );

    const handleParamChange = useCallback((key: string, value: string | number) => navigate({ [key]: value }), [navigate]);

    const handleViewModeChange = useCallback((value: RekapViewMode) => navigate({}, value), [navigate]);

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
        handleParamChange,
        handleViewModeChange,
        handlePrint,
    };
}
