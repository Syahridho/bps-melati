import { ActiveFilterBar } from '@/components/molecules/active-filter-bar';
import { CompletedReportsFilterTabs } from '@/components/molecules/completed-reports-filter-tabs';
import { Pagination } from '@/components/molecules/pagination';
import { ReportListToolbar } from '@/components/molecules/report-list-toolbar';
import { toTicketListEntry } from '@/components/organisms/ticket-completed/adapter';
import { TicketList } from '@/components/organisms/ticket-list/ticket-list';
import { useCompletedReportsFilters } from '@/hooks/use-completed-reports-filters';
import { useLaporanRealtime } from '@/hooks/use-reports-realtime';
import AdminPage from '@/layouts/dashboard/page';
import { buildActiveFilters } from '@/lib/report-list';
import { type CompletedReportsProps } from '@/types/completed-reports';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function CompletedReportsView() {
    const { auth, tickets, filters, counts } = usePage<CompletedReportsProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const { searchQuery, setSearchQuery, isLoading, handleFilterChange, handleRangeChange, handlePerPageChange, handleResetFilters } =
        useCompletedReportsFilters(routePrefix, filters);

    const [flagPopoverOpen, setFlagPopoverOpen] = useState(false);
    const searching = searchQuery.trim() !== '' && searchQuery !== (filters.search || '');

    useLaporanRealtime({ isBusy: flagPopoverOpen, searching, only: ['tickets', 'counts'] });

    const activeFilters = buildActiveFilters(filters, {
        clearTab: () => handleFilterChange('semua'),
        clearSearch: () => setSearchQuery(''),
        clearDate: () => handleRangeChange(null, null),
    });

    const entries = tickets.data.map((t) => toTicketListEntry(t, routePrefix));

    return (
        <AdminPage
            title="Laporan Selesai"
            description="Daftar laporan yang sudah direspon"
            breadcrumbs={[{ title: 'Laporan Selesai', href: route(`${routePrefix}.completed-reports.index`) }]}
        >
            <div className="bg-card overflow-hidden rounded-lg border">
                <ReportListToolbar
                    search={searchQuery}
                    onSearchChange={setSearchQuery}
                    from={filters.from}
                    to={filters.to}
                    onRangeChange={handleRangeChange}
                />

                <ActiveFilterBar items={activeFilters} onReset={handleResetFilters} />

                <CompletedReportsFilterTabs currentFilter={filters.filter} counts={counts} onFilterChange={handleFilterChange} />

                {entries.length === 0 ? (
                    <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                        <p className="text-sm">Tidak ada laporan pada rentang ini</p>
                    </div>
                ) : (
                    <TicketList
                        tickets={entries}
                        isLoading={isLoading}
                        isPopoverOpenControlled={flagPopoverOpen}
                        onPopoverOpenChangeControlled={setFlagPopoverOpen}
                    />
                )}

                <Pagination
                    links={tickets.links}
                    from={tickets.from}
                    to={tickets.to}
                    total={tickets.total}
                    lastPage={tickets.last_page}
                    perPage={filters.per_page}
                    onPerPageChange={handlePerPageChange}
                />
            </div>
        </AdminPage>
    );
}
