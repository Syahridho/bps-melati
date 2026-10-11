import { ticketPublicChannel } from '@/lib/laporan-masuk-utils';
import { type TicketDetail } from '@/types/check';
import { router } from '@inertiajs/react';
import { useEchoPublic } from '@laravel/echo-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

export function useCheckTicket(initialTicketNumber: string, ticket: TicketDetail | null, flashSuccess?: string) {
    const [inputQuery, setInputQuery] = useState(initialTicketNumber || '');
    const [copied, setCopied] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [completing, setCompleting] = useState(false);
    const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

    useEchoPublic(ticket ? ticketPublicChannel(ticket.ticket_number) : '', '.ticket.updated', () => {
        // Ketika ada update dari WebSocket, muat ulang data tiket dari server
        router.reload({ only: ['ticket'] });
    });

    useEffect(() => {
        if (flashSuccess) {
            setSuccessMessage(flashSuccess);
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flashSuccess]);

    function handleSearch(e: FormEvent) {
        e.preventDefault();
        const trimmed = inputQuery.trim();
        if (!trimmed) return;

        router.get(route('tickets.check'), { ticket_number: trimmed }, { preserveState: true, preserveScroll: true });
    }

    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, []);

    function handleComplete() {
        if (!ticket) return;
        setCompleting(true);
        router.post(
            route('tickets.check.complete', { ticketNumber: ticket.ticket_number }),
            {},
            {
                preserveScroll: true,
                onFinish: () => setCompleting(false),
            },
        );
    }

    return {
        inputQuery,
        setInputQuery,
        handleSearch,
        copied,
        handleCopy,
        successMessage,
        completing,
        isCompleteDialogOpen,
        setIsCompleteDialogOpen,
        handleComplete,
    };
}
