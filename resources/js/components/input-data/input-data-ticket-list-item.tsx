import { Badge } from '@/components/ui/badge';
import { classificationLabel, classificationVariant, formatDate, getTicketDisplayTitle, statusLabel } from '@/lib/input-data-utils';
import { cn } from '@/lib/utils';
import { type TicketItem } from '@/types/input-data';
import { Link } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';

interface InputDataTicketListItemProps {
    ticket: TicketItem;
    routePrefix: string;
}

export function InputDataTicketListItem({ ticket, routePrefix }: InputDataTicketListItemProps) {
    return (
        <div className={cn('group hover:bg-muted/50 transition-colors', ticket.is_read === false && 'bg-primary/[0.03]')}>
            <div className="flex gap-3 px-4 py-3">
                <Link href={route(`${routePrefix}.input-data.show`, { ticketNumber: ticket.ticket_number })} className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                        <span
                            className={cn(
                                'truncate text-sm',
                                ticket.is_read === false ? 'text-foreground font-semibold' : 'text-foreground font-medium',
                            )}
                        >
                            {getTicketDisplayTitle(ticket)}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs">{formatDate(ticket.created_at)}</span>
                    </div>
                    <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                        {ticket.is_read === false && <span className="inline-block size-2 shrink-0 rounded-full bg-blue-500" />}
                        <span className="text-foreground font-medium">{ticket.ticket_number}</span>
                        {ticket.reporter_name && (
                            <>
                                <span>&bull;</span>
                                <span>{ticket.reporter_name}</span>
                            </>
                        )}
                    </div>
                    <p className="text-muted-foreground mb-2 truncate text-xs">{ticket.content}</p>
                    <div className="flex items-center gap-1.5">
                        <Badge variant={classificationVariant(ticket.classification)} className="text-[10px]">
                            {classificationLabel(ticket.classification)}
                        </Badge>
                        {ticket.status === 'selesai' ? (
                            <Badge
                                variant="outline"
                                className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-400"
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
                    </div>
                </Link>
            </div>
        </div>
    );
}

export { InputDataTicketListItem as TicketListItem };
