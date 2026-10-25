import { type PaginatedData } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { classificationLabel, classificationVariant, formatDate, statusLabel } from '@/lib/laporan-masuk-utils';
import { cn } from '@/lib/utils';
import { type InboxTicketItem } from '@/types/laporan-masuk';
import { Link } from '@inertiajs/react';
import { CheckCircle2, Inbox, ShieldAlert } from 'lucide-react';

interface LaporanMasukTicketListProps {
    tickets: PaginatedData<InboxTicketItem>;
    isLoading: boolean;
    routePrefix: string;
    recentlyAnswered: Record<number, string>;
    onSelectTicket: (ticketId: number) => void;
}

function getTicketDisplayTitle(ticket: InboxTicketItem): string {
    if (ticket.title && ticket.title.trim().length > 0) {
        return ticket.title;
    }
    if (ticket.content && ticket.content.trim().length > 0) {
        const content = ticket.content.trim();
        return content.length > 60 ? content.slice(0, 60) + '...' : content;
    }
    return ticket.ticket_number;
}

export function LaporanMasukTicketList({ tickets, isLoading, routePrefix, recentlyAnswered, onSelectTicket }: LaporanMasukTicketListProps) {
    return (
        <div className={cn('divide-y transition-opacity duration-200', isLoading && 'pointer-events-none opacity-50')}>
            {tickets.data.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                    <Inbox className="mb-3 size-10" />
                    <p className="text-sm">Tidak ada laporan ditemukan</p>
                </div>
            ) : (
                tickets.data.map((ticket) => (
                    <div key={ticket.id} className={cn('group hover:bg-muted/50 transition-colors', !ticket.is_read && 'bg-primary/[0.03]')}>
                        <div className="flex gap-3 px-4 py-3">
                            <Link
                                href={route(`${routePrefix}.laporan-masuk.show`, { ticketNumber: ticket.ticket_number })}
                                className="min-w-0 flex-1"
                                onClick={() => onSelectTicket(ticket.id)}
                            >
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <span
                                        className={cn(
                                            'truncate text-sm',
                                            !ticket.is_read ? 'text-foreground font-semibold' : 'text-foreground font-medium',
                                        )}
                                    >
                                        {getTicketDisplayTitle(ticket)}
                                    </span>
                                    <span className="text-muted-foreground shrink-0 text-xs">{formatDate(ticket.created_at)}</span>
                                </div>
                                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                                    {!ticket.is_read && <span className="inline-block size-2 shrink-0 rounded-full bg-blue-500" />}
                                    <span className={cn('text-foreground font-medium')}>{ticket.ticket_number}</span>
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
                                    {ticket.status === 'selesai' ? (
                                        <Badge
                                            variant="outline"
                                            className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600"
                                        >
                                            <CheckCircle2 className="size-3" />
                                            Selesai
                                        </Badge>
                                    ) : ticket.status !== 'baru' ? (
                                        <Badge variant="outline" className="text-[10px]">
                                            {statusLabel(ticket.status)}
                                        </Badge>
                                    ) : null}
                                    <span className="text-muted-foreground text-[10px]">{ticket.channel}</span>
                                    {recentlyAnswered[ticket.id] && (
                                        <Badge variant="outline" className="text-[10px]">
                                            dibalas oleh {recentlyAnswered[ticket.id]}
                                        </Badge>
                                    )}
                                </div>
                            </Link>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
