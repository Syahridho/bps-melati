import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { FilterTab } from '../types';

export function useTicketFilters(routePrefix: string, initialFilters: { search: string; filter: FilterTab; per_page: number }) {
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSearchQuery(initialFilters.search || '');
    }, [initialFilters.search]);

    useEffect(() => {
        if (searchQuery === (initialFilters.search || '')) {
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                route(`${routePrefix}.input-data.index`),
                { filter: initialFilters.filter, search: searchQuery, per_page: initialFilters.per_page, page: 1 },
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
    }, [searchQuery, initialFilters.filter, initialFilters.per_page, initialFilters.search, routePrefix]);

    const handleFilterChange = (tab: FilterTab) => {
        router.get(
            route(`${routePrefix}.input-data.index`),
            { filter: tab, search: searchQuery, per_page: initialFilters.per_page, page: 1 },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setIsLoading(true),
                onFinish: () => setIsLoading(false),
            },
        );
    };

    const handlePerPageChange = (newPerPage: number) => {
        router.get(
            route(`${routePrefix}.input-data.index`),
            { filter: initialFilters.filter, search: searchQuery, per_page: newPerPage, page: 1 },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setIsLoading(true),
                onFinish: () => setIsLoading(false),
            },
        );
    };

    return { searchQuery, setSearchQuery, isLoading, handleFilterChange, handlePerPageChange };
}
