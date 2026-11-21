import { IncomingReportsFilterTabs } from '@/components/molecules/incoming-reports-filter-tabs';
import { DateRangeFilter } from '@/components/molecules/date-range-filter';
import { Pagination } from '@/components/molecules/pagination';
import { TicketList } from '@/components/organisms/ticket-list/ticket-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { toTicketListEntry } from '@/components/organisms/ticket-detail/adapters';
import { useInboxRealtime } from '@/hooks/use-inbox-realtime';
import { useIncomingReportsFilters } from '@/hooks/use-incoming-reports-filters';
import { useLaporanRealtime } from '@/hooks/use-reports-realtime';
import AdminPage from '@/layouts/dashboard/page';
import { type IncomingReportsProps } from '@/types/incoming-reports';
import { Head, Link, usePage } from '@inertiajs/react';
import { RotateCcw, Search, X } from 'lucide-react';
import { useState } from 'react';

interface IncomingReportsViewProps {
    /**
     * `my-reports` memakai komponen yang sama dengan Laporan Masuk, tetapi
     * route, judul, empty state, dan tautan detailnya berbeda.
     */
    mode?: 'incoming' | 'my-reports';
}

export default function IncomingReportsView({ mode = 'incoming' }: IncomingReportsViewProps) {
    const { auth, tickets, filters, counts, activeAssignmentMode } = usePage<IncomingReportsProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';
    const isMyReports = mode === 'my-reports';

    const routeName = isMyReports ? `${routePrefix}.my-reports.index` : `${routePrefix}.incoming-reports.index`;
    const title = isMyReports ? 'Laporan Saya' : 'Laporan Masuk';
    const description = isMyReports
        ? 'Daftar laporan aktif yang Anda tangani sebagai PIC.'
        : 'Daftar laporan pengaduan, aspirasi, dan permohonan informasi yang masuk.';

    const { searchQuery, setSearchQuery, isLoading, handleFilterChange, handleRangeChange, handlePerPageChange, handleResetFilters } =
        useIncomingReportsFilters(routeName, filters);

    const isSearching = searchQuery.trim() !== '' && searchQuery !== (filters.search || '');
    const { recentlyAnswered, clearRecentlyAnswered } = useInboxRealtime({ searching: isSearching });

    const [flagPopoverOpen, setFlagPopoverOpen] = useState(false);

    useLaporanRealtime({
        isBusy: flagPopoverOpen,
        searching: isSearching,
        only: ['tickets', 'counts', 'inbox_open_count', 'my_reports_open_count'],
    });

    const hasActiveFilters = filters.filter !== 'semua' || filters.search !== '' || (filters.from && filters.from !== 'semua');

    const detailQuery = isMyReports
        ? Object.fromEntries(
              Object.entries({
                  origin: 'my-reports',
                  tab: filters.filter,
                  q: filters.search,
                  per_page: filters.per_page,
                  from: filters.from,
                  to: filters.to,
                  page: tickets.current_page,
              }).filter(([, value]) => value !== null && value !== ''),
          )
        : {};

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
                    <IncomingReportsFilterTabs
                        currentFilter={filters.filter}
                        counts={counts}
                        onFilterChange={handleFilterChange}
                        showTanpaPic={!isMyReports}
                    />

                    {/* Ticket list */}
                    {tickets.data.length === 0 ? (
                        <div className="text-muted-foreground flex flex-col items-center justify-center gap-1 py-16 text-center">
                            {isMyReports ? (
                                hasActiveFilters ? (
                                    <p className="text-sm">Tidak ada laporan yang cocok dengan filter.</p>
                                ) : activeAssignmentMode === 'free' ? (
                                    <>
                                        <p className="text-sm">Belum ada laporan yang Anda tangani.</p>
                                        <p className="max-w-md text-xs">
                                            Pada mode keroyokan (free), laporan tidak memiliki penanggung jawab (PIC), sehingga daftar ini bisa kosong.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm">Belum ada laporan yang Anda tangani.</p>
                                        <Link
                                            href={route(`${routePrefix}.incoming-reports.index`)}
                                            className="text-primary text-xs font-medium hover:underline"
                                        >
                                            Ambil tiket di Laporan Masuk
                                        </Link>
                                    </>
                                )
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
