import { ActiveFilterBar } from '@/components/molecules/active-filter-bar';
import { AlertBanner } from '@/components/molecules/alert-banner';
import { ChannelFilter } from '@/components/molecules/channel-filter';
import { InputDataFilterTabs } from '@/components/molecules/input-data-filter-tabs';
import { Pagination } from '@/components/molecules/pagination';
import { ReportListToolbar } from '@/components/molecules/report-list-toolbar';
import { toTicketListEntry } from '@/components/organisms/ticket-list/adapter';
import { TicketList } from '@/components/organisms/ticket-list/ticket-list';
import { Button } from '@/components/ui/button';
import { useFlashMessage } from '@/hooks/use-flash-message';
import { useInputDataFilters } from '@/hooks/use-input-data-filters';
import AdminPage from '@/layouts/dashboard/page';
import { buildChannelFilterChips } from '@/lib/channel-filter';
import { buildActiveFilters } from '@/lib/report-list';
import { InputDataPageProps } from '@/types/input-data';
import { Head, usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import InputDataAddTicketDialog from './add-ticket-dialog';

export default function InputDataView() {
    const { auth, tickets, channels, filters, counts, flash } = usePage<InputDataPageProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [flagPopoverOpen, setFlagPopoverOpen] = useState(false);
    const flashMessage = useFlashMessage(flash?.success);

    const {
        searchQuery,
        setSearchQuery,
        isLoading,
        handleFilterChange,
        handleRangeChange,
        handleChannelChange,
        handlePerPageChange,
        handleResetFilters,
    } = useInputDataFilters(routePrefix, filters);

    // const searching = searchQuery.trim() !== '' && searchQuery !== (filters.search || '');
    // const handleNewTicket = useNewTicketToast({
    //     enabled: auth.user.role === 'admin',
    //     routePrefix,
    // });

    // const { isLive, connectionStatus } = useLaporanRealtime({
    //     isBusy: flagPopoverOpen,
    //     searching,
    //     only: ['tickets', 'counts'],
    //     onCreated: handleNewTicket,
    // });

    const channelChips = buildChannelFilterChips(channels, filters.channels).map((chip) => ({
        key: chip.key,
        label: `Kanal: ${chip.label}`,
        color: chip.color,
        onRemove: () => handleChannelChange(filters.channels.filter((id) => !chip.ids.includes(id))),
    }));

    const activeFilters = [
        ...buildActiveFilters(filters, {
            clearTab: () => handleFilterChange('semua'),
            clearSearch: () => setSearchQuery(''),
            clearDate: () => handleRangeChange('semua', 'semua'),
        }),
        ...channelChips,
    ];

    const entries = tickets.data.map((t) => toTicketListEntry(t, routePrefix));

    return (
        <AdminPage breadcrumbs={[{ title: 'Input Data', href: route(`${routePrefix}.input-data.index`) }]}>
            <Head title="Input Data" />
            <div className="space-y-6">
                {flashMessage.message && <AlertBanner variant="success" message={flashMessage.message} />}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Input Data</h2>
                        <p className="text-muted-foreground text-sm">Kelola dan tambahkan laporan, aspirasi, atau permintaan informasi baru.</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {/* <ConnectionIndicator isLive={isLive} connectionStatus={connectionStatus} /> */}
                        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Tambah Data Baru
                        </Button>
                    </div>
                </div>

                <div className="bg-card overflow-hidden rounded-lg border">
                    <ReportListToolbar
                        search={searchQuery}
                        onSearchChange={setSearchQuery}
                        from={filters.from}
                        to={filters.to}
                        onRangeChange={handleRangeChange}
                        channelFilter={<ChannelFilter channels={channels} value={filters.channels} onApply={handleChannelChange} />}
                    />

                    <ActiveFilterBar items={activeFilters} onReset={handleResetFilters} />

                    <InputDataFilterTabs currentFilter={filters.filter} counts={counts} onFilterChange={handleFilterChange} />

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
            </div>

            <InputDataAddTicketDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} channels={channels} routePrefix={routePrefix} />
        </AdminPage>
    );
}
