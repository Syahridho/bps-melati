import { DateRangeFilter } from '@/components/date-range-filter';
import { LaporanSelesaiFilterTabs } from '@/components/laporan-selesai-filter-tabs';
import { LaporanSelesaiTicketList } from '@/components/laporan-selesai-ticket-list';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLaporanSelesaiFilters } from '@/hooks/use-laporan-selesai-filters';
import AdminPage from '@/pages/admin/page';
import { type LaporanSelesaiProps } from '@/types/laporan-selesai';
import { usePage } from '@inertiajs/react';
import { RotateCcw, Search, X } from 'lucide-react';

export default function LaporanSelesai() {
    const { auth, tickets, filters, counts } = usePage<LaporanSelesaiProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const { searchQuery, setSearchQuery, isLoading, handleFilterChange, handleRangeChange, handlePerPageChange, handleResetFilters } =
        useLaporanSelesaiFilters(routePrefix, filters);

    const hasActiveFilters = filters.filter !== 'semua' || filters.search !== '' || (filters.from && filters.from !== 'semua');

    return (
        <AdminPage
            title="Laporan Selesai"
            description="Daftar laporan yang sudah direspon"
            breadcrumbs={[{ title: 'Laporan Selesai', href: route(`${routePrefix}.laporan-selesai.index`) }]}
        >
            <div className="bg-card overflow-hidden rounded-lg border">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
                    <div className="relative min-w-[12rem] flex-1">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input placeholder="Cari laporan..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                                <button onClick={() => handleRangeChange(null, null)} className="hover:text-foreground">
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
                <LaporanSelesaiFilterTabs currentFilter={filters.filter} counts={counts} onFilterChange={handleFilterChange} />

                {/* Ticket list */}
                {tickets.data.length === 0 ? (
                    <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                        <p className="text-sm">Tidak ada laporan pada rentang ini</p>
                        <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-3">
                            Reset filter
                        </Button>
                    </div>
                ) : (
                    <LaporanSelesaiTicketList tickets={tickets} isLoading={isLoading} routePrefix={routePrefix} />
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
        </AdminPage>
    );
}
