import { ActiveFilterBar } from '@/components/molecules/active-filter-bar';
import { ChannelFilter } from '@/components/molecules/channel-filter';
import { IncomingReportsFilterTabs } from '@/components/molecules/incoming-reports-filter-tabs';
import { Pagination } from '@/components/molecules/pagination';
import { ReportListToolbar } from '@/components/molecules/report-list-toolbar';
import { MyReportsEmptyState } from '@/components/organisms/incoming-reports/my-reports-empty-state';

import { toTicketListEntry } from '@/components/organisms/ticket-detail/adapters';
import { TicketList } from '@/components/organisms/ticket-list/ticket-list';
import { useInboxRealtime } from '@/hooks/use-inbox-realtime';
import { useIncomingReportsFilters } from '@/hooks/use-incoming-reports-filters';
import { useLaporanRealtime } from '@/hooks/use-reports-realtime';
import AdminPage from '@/layouts/dashboard/page';
import { buildChannelFilterChips } from '@/lib/channel-filter';
import { buildActiveFilters, buildMyReportsDetailQuery } from '@/lib/report-list';
import { type IncomingReportsProps } from '@/types/incoming-reports';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface IncomingReportsViewProps {
    /** `my-reports` memakai komponen yang sama, tetapi route, judul, empty state, dan tautan detailnya berbeda. */
    mode?: 'incoming' | 'my-reports';
}

const PAGE_TEXT = {
    incoming: {
        title: 'Laporan Masuk',
        description: 'Daftar laporan pengaduan, aspirasi, dan permohonan informasi yang masuk.',
        routeSegment: 'incoming-reports',
    },
    'my-reports': {
        title: 'Laporan Saya',
        description: 'Daftar laporan aktif yang Anda tangani sebagai PIC.',
        routeSegment: 'my-reports',
    },
} as const;

export default function IncomingReportsView({ mode = 'incoming' }: IncomingReportsViewProps) {
    const { auth, tickets, filters, counts, activeAssignmentMode, channels = [] } = usePage<IncomingReportsProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';
    const isMyReports = mode === 'my-reports';

    const { title, description, routeSegment } = PAGE_TEXT[mode];
    const routeName = `${routePrefix}.${routeSegment}.index`;

    const {
        searchQuery,
        setSearchQuery,
        isLoading,
        handleFilterChange,
        handleRangeChange,
        handleChannelChange,
        handlePerPageChange,
        handleResetFilters,
    } = useIncomingReportsFilters(routeName, filters);

    const isSearching = searchQuery.trim() !== '' && searchQuery !== (filters.search || '');
    const { recentlyAnswered, clearRecentlyAnswered } = useInboxRealtime({ searching: isSearching });

    const [flagPopoverOpen, setFlagPopoverOpen] = useState(false);

    useLaporanRealtime({
        isBusy: flagPopoverOpen,
        searching: isSearching,
        only: ['tickets', 'counts', 'inbox_open_count', 'my_reports_open_count'],
    });

    const selectedChannels = filters.channels ?? [];
    const channelChips = buildChannelFilterChips(channels, selectedChannels).map((chip) => ({
        key: chip.key,
        label: `Kanal: ${chip.label}`,
        color: chip.color,
        onRemove: () => handleChannelChange(selectedChannels.filter((id) => !chip.ids.includes(id))),
    }));

    const activeFilters = [
        ...buildActiveFilters(filters, {
            clearTab: () => handleFilterChange('semua'),
            clearSearch: () => setSearchQuery(''),
            clearDate: () => handleRangeChange('semua', 'semua'),
        }),
        ...channelChips,
    ];

    const detailQuery = isMyReports ? buildMyReportsDetailQuery(filters, tickets.current_page) : {};
    const entries = tickets.data.map((t) => toTicketListEntry(t, routePrefix, recentlyAnswered, activeAssignmentMode, detailQuery));

    return (
        <AdminPage breadcrumbs={[{ title, href: route(routeName) }]}>
            <Head title={title} />
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                    <p className="text-muted-foreground text-sm">{description}</p>
                </div>

                <div className="bg-card overflow-hidden rounded-lg border">
                    <ReportListToolbar
                        search={searchQuery}
                        onSearchChange={setSearchQuery}
                        from={filters.from}
                        to={filters.to}
                        onRangeChange={handleRangeChange}
                        channelFilter={
                            channels.length > 0 ? (
                                <ChannelFilter channels={channels} value={selectedChannels} onApply={handleChannelChange} />
                            ) : null
                        }
                    />

                    <ActiveFilterBar items={activeFilters} onReset={handleResetFilters} />

                    <IncomingReportsFilterTabs
                        currentFilter={filters.filter}
                        counts={counts}
                        onFilterChange={handleFilterChange}
                        showTanpaPic={!isMyReports}
                    />

                    {entries.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center justify-center gap-1 py-16 text-center">
                            {isMyReports ? (
                                <MyReportsEmptyState
                                    hasActiveFilters={activeFilters.length > 0}
                                    assignmentMode={activeAssignmentMode}
                                    incomingHref={route(`${routePrefix}.incoming-reports.index`)}
                                />
                            ) : (
                                <p className="text-sm">Tidak ada laporan pada rentang ini</p>
                            )}
                        </div>
                    ) : (
                        <TicketList
                            tickets={entries}
                            isLoading={isLoading}
                            onSelectTicket={clearRecentlyAnswered}
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
            </div>
        </AdminPage>
    );
}
