import { InputDataTicketListItem } from '@/components/input-data-ticket-list-item';
import { type PaginatedData } from '@/components/pagination';
import { cn } from '@/lib/utils';
import { type TicketItem } from '@/types/input-data';
import { Inbox } from 'lucide-react';

interface InputDataTicketListProps {
    tickets: PaginatedData<TicketItem>;
    isLoading: boolean;
    routePrefix: string;
}

export function InputDataTicketList({ tickets, isLoading, routePrefix }: InputDataTicketListProps) {
    return (
        <div className={cn('divide-y transition-opacity duration-200', isLoading && 'pointer-events-none opacity-50')}>
            {tickets.data.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
                    <Inbox className="mb-3 size-10" />
                    <p className="text-sm">Tidak ada laporan ditemukan</p>
                </div>
            ) : (
                tickets.data.map((ticket) => <InputDataTicketListItem key={ticket.id} ticket={ticket} routePrefix={routePrefix} />)
            )}
        </div>
    );
}

export { InputDataTicketList as TicketList };
