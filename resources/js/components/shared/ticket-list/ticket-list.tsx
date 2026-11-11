import { TicketListItem } from '@/components/shared/ticket-list/ticket-list-item';
import type { TicketListEntry } from '@/components/shared/ticket-list/types';
import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';
import { useState } from 'react';

interface TicketListProps {
    tickets: TicketListEntry[];
    isLoading: boolean;
    emptyText?: string;
    onSelectTicket?: (ticketId: number) => void;
    isPopoverOpenControlled?: boolean;
    onPopoverOpenChangeControlled?: (open: boolean) => void;
}

export function TicketList({ tickets, isLoading, emptyText = 'Tidak ada laporan ditemukan', onSelectTicket, isPopoverOpenControlled, onPopoverOpenChangeControlled }: TicketListProps) {
    const [internalIsPopoverOpen, setInternalIsPopoverOpen] = useState<number | null>(null);

    const isControlled = isPopoverOpenControlled !== undefined;
    const isPopoverOpen = isControlled ? isPopoverOpenControlled : internalIsPopoverOpen !== null;
    const onPopoverOpenChangeInternal = (open: boolean) => {
        if (!isControlled) {
            setInternalIsPopoverOpen(open ? 1 : null);
        }
        onPopoverOpenChangeControlled?.(open);
    };

    return (
        <div className={cn('divide-y transition-opacity duration-200', isLoading && 'pointer-events-none opacity-50')}>
            {tickets.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                    <Inbox className="mb-3 size-10" />
                    <p className="text-sm">{emptyText}</p>
                </div>
            ) : (
                tickets.map((ticket) => (
                    <TicketListItem
                        key={ticket.id}
                        ticket={ticket}
                        isPopoverOpen={isPopoverOpen}
                        onPopoverOpenChange={onPopoverOpenChangeInternal}
                        onSelect={onSelectTicket}
                    />
                ))
            )}
        </div>
    );
}
