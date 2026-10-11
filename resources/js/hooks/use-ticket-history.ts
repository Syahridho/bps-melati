import { getStoredTickets } from '@/lib/welcome-utils';
import { type StoredTicket } from '@/types/welcome';
import { useCallback, useEffect, useState } from 'react';

export function useTicketHistory() {
    const [ticketHistory, setTicketHistory] = useState<StoredTicket[]>([]);
    const [ticketToDelete, setTicketToDelete] = useState<StoredTicket | null>(null);

    useEffect(() => {
        setTicketHistory(getStoredTickets());
    }, []);

    const saveTicket = useCallback((ticketNumber: string) => {
        const stored = getStoredTickets();
        stored.push({
            ticket_number: ticketNumber,
            created_at: new Date().toISOString(),
        });
        localStorage.setItem('melati_tickets', JSON.stringify(stored));
        setTicketHistory(stored);
    }, []);

    function handleDeleteTicket() {
        if (!ticketToDelete) {
            return;
        }

        const updated = getStoredTickets().filter((t) => t.ticket_number !== ticketToDelete.ticket_number);
        localStorage.setItem('melati_tickets', JSON.stringify(updated));
        setTicketHistory(updated);
        setTicketToDelete(null);
    }

    return {
        ticketHistory,
        ticketToDelete,
        setTicketToDelete,
        handleDeleteTicket,
        saveTicket,
    };
}
