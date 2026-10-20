import { DateRangeFilter } from '@/components/date-range-filter';
import { LaporanMasukFilterTabs } from '@/components/laporan-masuk-filter-tabs';
import { LaporanMasukTicketList } from '@/components/laporan-masuk-ticket-list';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInboxRealtime } from '@/hooks/use-inbox-realtime';
import { useLaporanMasukFilters } from '@/hooks/use-laporan-masuk-filters';
import AdminPage from '@/pages/admin/page';
import { type LaporanMasukProps } from '@/types/laporan-masuk';
import { useEcho } from '@laravel/echo-react';
import { Head, router, usePage } from '@inertiajs/react';
import { RotateCcw, Search, X } from 'lucide-react';

export default function LaporanMasuk() {
    const { auth, tickets, filters, counts, server_now } = usePage<LaporanMasukProps>().props;
    const routePrefix = auth.user.role === 'admin' 
        ? 'dashboard.admin' 
        : auth.user.role === 'operator_tim' 
        ? 'dashboard.operator-tim' 
        : 'dashboard.operator';

    const { searchQuery, setSearchQuery, isLoading, handleFilterChange, handleRangeChange, handlePerPageChange, handleResetFilters } =
        useLaporanMasukFilters(routePrefix, filters);

    // Jangan reload otomatis saat pengguna sedang mengetik di kolom pencarian.
    const isSearching = searchQuery.trim() !== '' && searchQuery !== (filters.search || '');
    const { recentlyAnswered, clearRecentlyAnswered } = useInboxRealtime({ searching: isSearching });

    const hasActiveFilters = filters.filter !== 'semua' || filters.search !== '' || (filters.from && filters.from !== 'semua');

    useEcho<{ ticket_id: number; ticket_number: string; bookmarked: boolean; ditandai_count: number; origin?: string }>(
        auth?.user ? `user.${auth.user.id}` : '',
        '.ticket.bookmark.changed',
        (event) => {
           const socketId = (
                window as unknown as { Echo?: { socketId?: () => string | undefined } }
            ).Echo?.socketId?.();
            if (event.origin && socketId && event.origin === socketId) {
                return;
            }
            router.reload({ only: ['tickets', 'counts'] });
        },
        [auth?.user?.id]
    );

    return (
        <AdminPage breadcrumbs={[{ title: 'Laporan Masuk', href: route(`${routePrefix}.laporan-masuk.index`) }]}>
            <Head title="Laporan Masuk" />
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Laporan Masuk</h2>
                    <p className="text-muted-foreground text-sm">Daftar laporan pengaduan, aspirasi, dan permohonan informasi yang masuk.</p>
                </div>

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

                    {/* Active filter summary / badge */}
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
                                    Pencarian: "{filters.search}"
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
                    <LaporanMasukFilterTabs currentFilter={filters.filter} counts={counts} onFilterChange={handleFilterChange} />

                    {/* Ticket list */}
                    {tickets.data.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                            <p className="text-sm">Tidak ada laporan pada rentang ini</p>
                            <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-3">
                                Reset filter
                            </Button>
                        </div>
                    ) : (
                        <LaporanMasukTicketList
                            tickets={tickets}
                            isLoading={isLoading}
                            routePrefix={routePrefix}
                            recentlyAnswered={recentlyAnswered}
                            onSelectTicket={clearRecentlyAnswered}
                            serverNow={server_now}
                        />
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
        </AdminPage>
    );
}
