import type { ActiveFilterItem } from '@/components/molecules/active-filter-bar';

interface ReportFilters {
    filter: string;
    search?: string | null;
    from?: string | null;
    to?: string | null;
}

interface ActiveFilterActions {
    clearTab: () => void;
    clearSearch: () => void;
    clearDate: () => void;
}

export function buildActiveFilters(filters: ReportFilters, actions: ActiveFilterActions): ActiveFilterItem[] {
    const items: (ActiveFilterItem | false | null | undefined | '')[] = [
        filters.filter !== 'semua' && { key: 'tab', label: `Tab: ${filters.filter}`, onRemove: actions.clearTab },
        filters.search && { key: 'search', label: `Pencarian: "${filters.search}"`, onRemove: actions.clearSearch },
        filters.from &&
            filters.from !== 'semua' && { key: 'date', label: `Tanggal: ${filters.from} s.d. ${filters.to}`, onRemove: actions.clearDate },
    ];

    return items.filter(Boolean) as ActiveFilterItem[];
}

export function buildMyReportsDetailQuery(
    filters: ReportFilters & { per_page?: number },
    currentPage: number,
): Record<string, string | number | null> {
    const query = {
        origin: 'my-reports',
        tab: filters.filter,
        q: filters.search,
        per_page: filters.per_page,
        from: filters.from,
        to: filters.to,
        page: currentPage,
    };

    return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== null && value !== undefined && value !== '')) as Record<
        string,
        string | number | null
    >;
}
