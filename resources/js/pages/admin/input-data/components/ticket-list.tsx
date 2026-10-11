import { PaginatedData } from '@/components/pagination';
import { cn } from '@/lib/utils';
import { Inbox } from 'lucide-react';
import { TicketItem } from '../types';
import { TicketListItem } from './ticket-list-item';

interface TicketListProps {
    tickets: PaginatedData<TicketItem>;
    isLoading: boolean;
    routePrefix: string;
}

export function TicketList({ tickets, isLoading, routePrefix }: TicketListProps) {
    return (
        <div className={cn('divide-y transition-opacity duration-200', isLoading && 'pointer-events-none opacity-50')}>
            {tickets.data.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                    <Inbox className="mb-3 size-10" />
                    <p className="text-sm">Tidak ada laporan ditemukan</p>
                </div>
            ) : (
                tickets.data.map((ticket) => <TicketListItem key={ticket.id} ticket={ticket} routePrefix={routePrefix} />)
            )}
        </div>
    );
}
