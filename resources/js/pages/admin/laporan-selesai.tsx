import { LaporanSelesaiFilterTabs } from '@/components/laporan-selesai-filter-tabs';
import { LaporanSelesaiTicketList } from '@/components/laporan-selesai-ticket-list';
import { Pagination } from '@/components/pagination';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLaporanSelesaiFilters } from '@/hooks/use-laporan-selesai-filters';
import AdminPage from '@/pages/admin/page';
import { type LaporanSelesaiProps } from '@/types/laporan-selesai';
import { usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';

export default function LaporanSelesai() {
    const { auth, tickets, filters, counts, periods } = usePage<LaporanSelesaiProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const { searchQuery, setSearchQuery, isLoading, handleFilterChange, handlePeriodChange, handlePerPageChange } = useLaporanSelesaiFilters(
        routePrefix,
        filters,
    );

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
                    <Select value={filters.period} onValueChange={handlePeriodChange}>
                        <SelectTrigger className="w-44 shrink-0">
                            <SelectValue placeholder="Pilih bulan" />
                        </SelectTrigger>
                        <SelectContent>
                            {periods.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Filter tabs */}
                <LaporanSelesaiFilterTabs currentFilter={filters.filter} counts={counts} onFilterChange={handleFilterChange} />

                {/* Ticket list */}
                <LaporanSelesaiTicketList tickets={tickets} isLoading={isLoading} routePrefix={routePrefix} />

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
