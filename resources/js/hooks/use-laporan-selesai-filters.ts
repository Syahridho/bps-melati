import { type FilterTab } from '@/types/laporan-selesai';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export function useLaporanSelesaiFilters(
    routePrefix: string,
    initialFilters: { search: string; filter: FilterTab; per_page: number; period: string },
) {
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
    const [isLoading, setIsLoading] = useState(false);

    const queryParams = (overrides: Record<string, string | number> = {}) => ({
        filter: initialFilters.filter,
        search: searchQuery,
        per_page: initialFilters.per_page,
        period: initialFilters.period,
        page: 1,
        ...overrides,
    });

    useEffect(() => {
        setSearchQuery(initialFilters.search || '');
    }, [initialFilters.search]);

    useEffect(() => {
        if (searchQuery === (initialFilters.search || '')) {
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                route(`${routePrefix}.laporan-selesai.index`),
                {
                    filter: initialFilters.filter,
                    search: searchQuery,
                    per_page: initialFilters.per_page,
                    period: initialFilters.period,
                    page: 1,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    onStart: () => setIsLoading(true),
                    onFinish: () => setIsLoading(false),
                },
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, initialFilters.filter, initialFilters.per_page, initialFilters.period, initialFilters.search, routePrefix]);

    const handleFilterChange = (tab: FilterTab) => {
        router.get(route(`${routePrefix}.laporan-selesai.index`), queryParams({ filter: tab }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setIsLoading(true),
            onFinish: () => setIsLoading(false),
        });
    };

    const handlePeriodChange = (period: string) => {
        router.get(route(`${routePrefix}.laporan-selesai.index`), queryParams({ period }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setIsLoading(true),
            onFinish: () => setIsLoading(false),
        });
    };

    const handlePerPageChange = (newPerPage: number) => {
        router.get(route(`${routePrefix}.laporan-selesai.index`), queryParams({ per_page: newPerPage }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setIsLoading(true),
            onFinish: () => setIsLoading(false),
        });
    };

    return {
        searchQuery,
        setSearchQuery,
        isLoading,
        handleFilterChange,
        handlePeriodChange,
        handlePerPageChange,
    };
}
