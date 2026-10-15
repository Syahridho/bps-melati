import { type FilterTab } from '@/types/laporan-selesai';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export function useLaporanSelesaiFilters(
    routePrefix: string,
    initialFilters: { search: string; filter: FilterTab; per_page: number; from: string | null; to: string | null },
) {
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
    const [isLoading, setIsLoading] = useState(false);

    const queryParams = (overrides: Record<string, string | number | null> = {}) => ({
        tab: initialFilters.filter,
        q: searchQuery,
        per_page: initialFilters.per_page,
        from: initialFilters.from,
        to: initialFilters.to,
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
                    tab: initialFilters.filter,
                    q: searchQuery,
                    per_page: initialFilters.per_page,
                    from: initialFilters.from,
                    to: initialFilters.to,
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
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery, initialFilters.filter, initialFilters.per_page, initialFilters.from, initialFilters.to, initialFilters.search, routePrefix]);

    const handleFilterChange = (tab: FilterTab) => {
        router.get(route(`${routePrefix}.laporan-selesai.index`), queryParams({ tab }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setIsLoading(true),
            onFinish: () => setIsLoading(false),
        });
    };

    const handleRangeChange = (from: string | null, to: string | null) => {
        router.get(route(`${routePrefix}.laporan-selesai.index`), queryParams({ from, to }), {
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

    const handleResetFilters = () => {
        router.get(
            route(`${routePrefix}.laporan-selesai.index`),
            {
                tab: 'semua',
                q: '',
                per_page: initialFilters.per_page,
                from: null,
                to: null,
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
    };

    return {
        searchQuery,
        setSearchQuery,
        isLoading,
        handleFilterChange,
        handleRangeChange,
        handlePerPageChange,
        handleResetFilters,
    };
}
