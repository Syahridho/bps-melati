import { Pagination, type PaginatedData } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AdminPage from '@/pages/admin/page';
import { type SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { Inbox, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';
type Status = 'baru' | 'respon_awal' | 'respon_substantif' | 'selesai';

interface Ticket {
    id: number;
    ticket_number: string;
    classification: Classification;
    title?: string | null;
    reporter_name: string | null;
    reporter_email: string | null;
    reporter_wa: string | null;
    content: string;
    status: Status;
    is_read: boolean;
    source_app: string;
    channel: string;
    created_at: string;
}

type FilterTab = 'semua' | 'belum_dibaca' | 'pengaduan' | 'aspirasi' | 'permintaan' | 'respon_awal' | 'respon_substantif';

interface LaporanMasukProps extends SharedData {
    tickets: PaginatedData<Ticket>;
    filters: {
        search: string;
        filter: FilterTab;
        per_page: number;
    };
    counts: {
        semua: number;
        belum_dibaca: number;
        pengaduan: number;
        aspirasi: number;
        permintaan: number;
        respon_awal: number;
        respon_substantif: number;
    };
}

function classificationLabel(classification: Classification): string {
    switch (classification) {
        case 'pengaduan':
            return 'Pengaduan';
        case 'aspirasi':
            return 'Aspirasi';
        case 'permintaan_informasi':
            return 'Permintaan Informasi';
    }
}

function classificationVariant(classification: Classification): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (classification) {
        case 'pengaduan':
            return 'destructive';
        case 'aspirasi':
            return 'default';
        case 'permintaan_informasi':
            return 'secondary';
    }
}

function statusLabel(status: Status): string {
    switch (status) {
        case 'baru':
            return 'Baru';
        case 'respon_awal':
            return 'Respon Awal';
        case 'respon_substantif':
            return 'Respon Substantif';
        case 'selesai':
            return 'Selesai';
    }
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) {
        return 'Kemarin';
    }
    if (diffDays < 7) {
        return `${diffDays} hari lalu`;
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function getTicketDisplayTitle(ticket: Ticket): string {
    if (ticket.title && ticket.title.trim().length > 0) {
        return ticket.title;
    }
    if (ticket.content && ticket.content.trim().length > 0) {
        const content = ticket.content.trim();
        return content.length > 60 ? content.slice(0, 60) + '...' : content;
    }
    return ticket.ticket_number;
}

export default function LaporanMasuk() {
    const { auth, tickets, filters, counts } = usePage<LaporanMasukProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSearchQuery(filters.search || '');
    }, [filters.search]);

    // Debounce search input (300 ms)
    useEffect(() => {
        if (searchQuery === (filters.search || '')) {
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                route(`${routePrefix}.laporan-masuk.index`),
                { filter: filters.filter, search: searchQuery, per_page: filters.per_page, page: 1 },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    onStart: () => setIsLoading(true),
                    onFinish: () => setIsLoading(false),
                },
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, filters.filter, filters.per_page, filters.search, routePrefix]);

    const handleFilterChange = (tab: FilterTab) => {
        router.get(
            route(`${routePrefix}.laporan-masuk.index`),
            { filter: tab, search: searchQuery, per_page: filters.per_page, page: 1 },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setIsLoading(true),
                onFinish: () => setIsLoading(false),
            },
        );
    };

    const handlePerPageChange = (newPerPage: number) => {
        router.get(
            route(`${routePrefix}.laporan-masuk.index`),
            { filter: filters.filter, search: searchQuery, per_page: newPerPage, page: 1 },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setIsLoading(true),
                onFinish: () => setIsLoading(false),
            },
        );
    };

    function toggleSelect(id: number) {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    }

    function toggleSelectAll() {
        if (selectedIds.length === tickets.data.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(tickets.data.map((t) => t.id));
        }
    }

    const filterTabs: { key: FilterTab; label: string; count?: number }[] = [
        { key: 'semua', label: 'Semua', count: counts.semua },
        { key: 'belum_dibaca', label: 'Belum Dibaca', count: counts.belum_dibaca },
        { key: 'pengaduan', label: 'Pengaduan', count: counts.pengaduan },
        { key: 'aspirasi', label: 'Aspirasi', count: counts.aspirasi },
        { key: 'permintaan', label: 'Permintaan Info', count: counts.permintaan },
        { key: 'respon_awal', label: 'Respon Awal', count: counts.respon_awal },
        { key: 'respon_substantif', label: 'Respon Substantif', count: counts.respon_substantif },
    ];

    return (
        <AdminPage
            title="Laporan Masuk"
            description="Daftar laporan yang baru masuk dan perlu ditindaklanjuti"
            breadcrumbs={[{ title: 'Laporan Masuk', href: route(`${routePrefix}.laporan-masuk.index`) }]}
        >
            <div className="overflow-hidden rounded-lg border bg-card">
                {/* Toolbar */}
                <div className="flex items-center gap-2 border-b px-4 py-3">
                    <Checkbox
                        checked={tickets.data.length > 0 && selectedIds.length === tickets.data.length}
                        onCheckedChange={toggleSelectAll}
                    />
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Cari laporan..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-1 overflow-x-auto border-b px-4 py-2">
                    {filterTabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => handleFilterChange(tab.key)}
                            className={cn(
                                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                                filters.filter === tab.key
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span
                                    className={cn(
                                        'inline-flex size-5 items-center justify-center rounded-full text-[10px]',
                                        filters.filter === tab.key ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20',
                                    )}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Ticket list */}
                <div className={cn('divide-y transition-opacity duration-200', isLoading && 'pointer-events-none opacity-50')}>
                    {tickets.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Inbox className="mb-3 size-10" />
                            <p className="text-sm">Tidak ada laporan ditemukan</p>
                        </div>
                    ) : (
                        tickets.data.map((ticket) => (
                            <div key={ticket.id} className={cn('group transition-colors hover:bg-muted/50', !ticket.is_read && 'bg-primary/[0.03]')}>
                                <div className="flex gap-3 px-4 py-3">
                                    <div className="flex shrink-0 flex-col items-center gap-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox checked={selectedIds.includes(ticket.id)} onCheckedChange={() => toggleSelect(ticket.id)} />
                                    </div>
                                    <Link
                                        href={route(`${routePrefix}.laporan-masuk.show`, { ticketNumber: ticket.ticket_number })}
                                        className="min-w-0 flex-1"
                                    >
                                        <div className="mb-1 flex items-center justify-between gap-2">
                                            <span className={cn('truncate text-sm', !ticket.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
                                                {getTicketDisplayTitle(ticket)}
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground">{formatDate(ticket.created_at)}</span>
                                        </div>
                                        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                                            {!ticket.is_read && <span className="inline-block size-2 shrink-0 rounded-full bg-blue-500" />}
                                            <span className={cn('font-medium text-foreground')}>{ticket.ticket_number}</span>
                                            {ticket.reporter_name && (
                                                <>
                                                    <span>•</span>
                                                    <span>{ticket.reporter_name}</span>
                                                </>
                                            )}
                                        </div>
                                        <p className="mb-2 truncate text-xs text-muted-foreground">{ticket.content}</p>
                                        <div className="flex items-center gap-1.5">
                                            <Badge variant={classificationVariant(ticket.classification)} className="text-[10px]">
                                                {classificationLabel(ticket.classification)}
                                            </Badge>
                                            {ticket.status !== 'baru' && (
                                                <Badge variant="outline" className="text-[10px]">
                                                    {statusLabel(ticket.status)}
                                                </Badge>
                                            )}
                                            <span className="text-[10px] text-muted-foreground">{ticket.channel}</span>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>

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
