import { type PaginatedData } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { classificationLabel, classificationVariant, statusLabel } from '@/lib/laporan-masuk-utils';
import { type TicketItem } from '@/types/laporan-selesai';
import { Link } from '@inertiajs/react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

interface LaporanSelesaiTicketListProps {
    tickets: PaginatedData<TicketItem>;
    isLoading: boolean;
    routePrefix: string;
}

function getTicketDisplayTitle(ticket: TicketItem): string {
    if (ticket.title && ticket.title.trim().length > 0) {
        return ticket.title;
    }
    if (ticket.content && ticket.content.trim().length > 0) {
        const content = ticket.content.trim();
        return content.length > 60 ? content.slice(0, 60) + '...' : content;
    }
    return ticket.ticket_number;
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

export function LaporanSelesaiTicketList({ tickets, isLoading, routePrefix }: LaporanSelesaiTicketListProps) {
    return (
        <div className={`divide-y transition-opacity duration-200 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
            {tickets.data.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                    <p className="text-sm">Tidak ada laporan ditemukan</p>
                </div>
            ) : (
                tickets.data.map((ticket) => (
                    <div key={ticket.id} className="group hover:bg-muted/50 transition-colors">
                        <div className="flex gap-3 px-4 py-3">
                            <Link
                                href={route(`${routePrefix}.laporan-selesai.show`, { ticketNumber: ticket.ticket_number })}
                                className="min-w-0 flex-1"
                            >
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <span className="text-foreground truncate text-sm font-medium">{getTicketDisplayTitle(ticket)}</span>
                                    <span className="text-muted-foreground shrink-0 text-xs">{formatDate(ticket.created_at)}</span>
                                </div>
                                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                                    <span className="text-foreground font-medium">{ticket.ticket_number}</span>
                                    {ticket.reporter_name && (
                                        <>
                                            <span>•</span>
                                            <span>{ticket.reporter_name}</span>
                                        </>
                                    )}
                                </div>
                                <p className="text-muted-foreground mb-2 truncate text-xs">{ticket.content}</p>
                                <div className="flex items-center gap-1.5">
                                    <Badge variant={classificationVariant(ticket.classification)} className="text-[10px]">
                                        {classificationLabel(ticket.classification)}
                                    </Badge>
                                    {ticket.is_pengawasan && (
                                        <Badge
                                            variant="outline"
                                            className="gap-1 border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
                                        >
                                            <ShieldAlert className="size-3" />
                                            Pengawasan
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600">
                                        <CheckCircle2 className="size-3" />
                                        {statusLabel(ticket.status)}
                                    </Badge>
                                    <span className="text-muted-foreground text-[10px]">{ticket.channel}</span>
                                </div>
                            </Link>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
