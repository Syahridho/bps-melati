import { TicketFlagButton } from '@/components/shared/ticket-flag-button';
import type { TicketListEntry } from '@/components/shared/ticket-list/types';
import { Badge } from '@/components/ui/badge';
import { classificationLabel, classificationVariant, formatDate, statusLabel } from '@/lib/laporan-masuk-utils';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { memo } from 'react';

interface TicketListItemProps {
    ticket: TicketListEntry;
    isPopoverOpen: boolean;
    onPopoverOpenChange: (open: boolean) => void;
    onSelect?: (ticketId: number) => void;
}

export const TicketListItem = memo(function TicketListItem({ ticket, isPopoverOpen, onPopoverOpenChange, onSelect }: TicketListItemProps) {
    const unread = ticket.is_read === false;

    return (
        <div className={cn('group hover:bg-muted/50 transition-colors', unread && 'bg-primary/[0.03]')}>
            <div className="flex gap-3 px-4 py-3">
                <Link href={ticket.show_href} className="min-w-0 flex-1" onClick={() => onSelect?.(ticket.id)}>
                    <div className="mb-1">
                        <span
                            className={cn(
                                'block truncate text-sm',
                                unread ? 'text-foreground font-semibold' : 'text-foreground font-medium',
                            )}
                        >
                            {ticket.display_title}
                        </span>
                    </div>
                    <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                        {unread && <span className="inline-block size-2 shrink-0 rounded-full bg-blue-500" />}
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
                        {ticket.recently_answered_by && (
                            <Badge variant="outline" className="text-[10px]">
                                dibalas oleh {ticket.recently_answered_by}
                            </Badge>
                        )}
                    </div>
                </Link>

                {/* Right column: flag button + time (Laporan Masuk reference layout) */}
                <div className="flex shrink-0 flex-col items-end pt-1">
                    {ticket.tandai_route ? (
                        <TicketFlagButton
                            ticket={{
                                ticket_number: ticket.ticket_number,
                                is_flagged: ticket.is_flagged,
                                flag_note: ticket.flag_note,
                                flagged_by_name: ticket.flagged_by_name,
                            }}
                            tandaiRoute={ticket.tandai_route}
                            open={isPopoverOpen}
                            onOpenChange={onPopoverOpenChange}
                            onFlagChange={() => {
                                router.reload({ only: ['counts'] });
                            }}
                            variant="icon"
                        />
                    ) : (
                        /* Placeholder to keep time alignment consistent when flag is disabled */
                        <span className="size-7" />
                    )}
                    <span className="text-muted-foreground mt-1 text-[11px] whitespace-nowrap">{formatDate(ticket.created_at)}</span>
                </div>
            </div>
        </div>
    );
});
