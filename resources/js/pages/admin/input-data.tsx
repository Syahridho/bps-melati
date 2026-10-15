import { DateRangeFilter } from '@/components/date-range-filter';
import { InputDataAddTicketDialog } from '@/components/input-data-add-ticket-dialog';
import { InputDataFilterTabs } from '@/components/input-data-filter-tabs';
import { InputDataTicketList } from '@/components/input-data-ticket-list';
import { Pagination, type PaginatedData } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInputDataFilters } from '@/hooks/use-input-data-filters';
import AdminPage from '@/pages/admin/page';
import { type SharedData } from '@/types';
import { type ChannelGroup, type FilterTab, type TicketItem } from '@/types/input-data';
import { Head, usePage } from '@inertiajs/react';
import { CheckCircle2, Plus, RotateCcw, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface InputDataPageProps extends SharedData {
    tickets: PaginatedData<TicketItem>;
    channels: ChannelGroup[];
    filters: {
        search: string;
        filter: FilterTab;
        per_page: number;
        from: string | null;
        to: string | null;
    };
    counts: {
        semua: number;
        pengaduan: number;
        aspirasi: number;
        permintaan: number;
    };
    flash: {
        ticket_number?: string;
        success?: string;
    };
}

export default function InputData() {
    const { auth, tickets, channels, filters, counts, flash } = usePage<InputDataPageProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const { searchQuery, setSearchQuery, isLoading, handleFilterChange, handleRangeChange, handlePerPageChange, handleResetFilters } =
        useInputDataFilters(routePrefix, filters);

    useEffect(() => {
        if (flash?.success) {
            setSuccessMessage(flash.success);
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    const hasActiveFilters = filters.filter !== 'semua' || filters.search !== '' || (filters.from && filters.from !== 'semua');

    return (
        <AdminPage breadcrumbs={[{ title: 'Input Data', href: route(`${routePrefix}.input-data.index`) }]}>
            <Head title="Input Data" />
            <div className="space-y-6">
                {/* Header & Success Alert */}
                {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Input Data</h2>
                        <p className="text-muted-foreground text-sm">Kelola dan tambahkan laporan, aspirasi, atau permintaan informasi baru.</p>
                    </div>
                    <Button onClick={() => setIsAddDialogOpen(true)} className="shrink-0 gap-2">
                        <Plus className="h-4 w-4" />
                        Tambah Data Baru
                    </Button>
                </div>

                {/* Inbox Card Layout */}
                <div className="bg-card overflow-hidden rounded-lg border">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
                        <div className="relative min-w-[12rem] flex-1">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                placeholder="Cari laporan..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <DateRangeFilter from={filters.from} to={filters.to} onRangeChange={handleRangeChange} />
                    </div>

                    {/* Active filter summary */}
                    {hasActiveFilters && (
                        <div className="bg-muted/30 flex flex-wrap items-center gap-2 border-b px-4 py-2 text-xs">
                            <span className="text-muted-foreground font-medium">Filter aktif:</span>
                            {filters.filter !== 'semua' && (
                                <Badge variant="secondary" className="gap-1">
                                    Tab: {filters.filter}
                                    <button onClick={() => handleFilterChange('semua')} className="hover:text-foreground">
                                        <X className="size-3" />
                                    </button>
                                </Badge>
                            )}
                            {filters.search && (
                                <Badge variant="secondary" className="gap-1">
                                    Pencarian: &quot;{filters.search}&quot;
                                    <button onClick={() => setSearchQuery('')} className="hover:text-foreground">
                                        <X className="size-3" />
                                    </button>
                                </Badge>
                            )}
                            {filters.from && filters.from !== 'semua' && (
                                <Badge variant="secondary" className="gap-1">
                                    Tanggal: {filters.from} s.d. {filters.to}
                                    <button onClick={() => handleRangeChange('semua', 'semua')} className="hover:text-foreground">
                                        <X className="size-3" />
                                    </button>
                                </Badge>
                            )}
                            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-6 px-2 text-xs">
                                <RotateCcw className="mr-1 size-3" />
                                Reset semua
                            </Button>
                        </div>
                    )}

                    {/* Filter tabs */}
                    <InputDataFilterTabs currentFilter={filters.filter} counts={counts} onFilterChange={handleFilterChange} />

                    {/* Ticket list */}
                    {tickets.data.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                            <p className="text-sm">Tidak ada laporan pada rentang ini</p>
                            <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-3">
                                Reset filter
                            </Button>
                        </div>
                    ) : (
                        <InputDataTicketList tickets={tickets} isLoading={isLoading} routePrefix={routePrefix} />
                    )}

                    {/* Pagination Footer */}
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
