import { LaporanMasukFilterTabs } from '@/components/laporan-masuk-filter-tabs';
import { LaporanMasukTicketList } from '@/components/laporan-masuk-ticket-list';
import { Pagination } from '@/components/pagination';
import { Input } from '@/components/ui/input';
import { useInboxRealtime } from '@/hooks/use-inbox-realtime';
import { useLaporanMasukFilters } from '@/hooks/use-laporan-masuk-filters';
import AdminPage from '@/pages/admin/page';
import { type LaporanMasukProps } from '@/types/laporan-masuk';
import { Head, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';

export default function LaporanMasuk() {
    const { auth, tickets, filters, counts } = usePage<LaporanMasukProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const { searchQuery, setSearchQuery, isLoading, handleFilterChange, handlePerPageChange } = useLaporanMasukFilters(routePrefix, filters);

    // Jangan reload otomatis saat pengguna sedang mengetik di kolom pencarian.
    const isSearching = searchQuery.trim() !== '' && searchQuery !== (filters.search || '');
    const { recentlyAnswered, clearRecentlyAnswered } = useInboxRealtime({ searching: isSearching });

    return (
        <AdminPage breadcrumbs={[{ title: 'Laporan Masuk', href: route(`${routePrefix}.laporan-masuk.index`) }]}>
            <Head title="Laporan Masuk" />
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Laporan Masuk</h2>
                    <p className="text-muted-foreground text-sm">Daftar laporan pengaduan, aspirasi, dan permohonan informasi yang masuk.</p>
                </div>

                <div className="bg-card overflow-hidden rounded-lg border">
                    {/* Search bar */}
                    <div className="flex items-center gap-2 border-b px-4 py-3">
                        <div className="relative flex-1">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                placeholder="Cari laporan..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <LaporanMasukFilterTabs currentFilter={filters.filter} counts={counts} onFilterChange={handleFilterChange} />

                    {/* Ticket list */}
                    <LaporanMasukTicketList
                        tickets={tickets}
                        isLoading={isLoading}
                        routePrefix={routePrefix}
                        recentlyAnswered={recentlyAnswered}
                        onSelectTicket={clearRecentlyAnswered}
                    />

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
