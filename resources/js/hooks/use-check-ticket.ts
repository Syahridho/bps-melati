import { ticketPublicChannel } from '@/lib/incoming-reports-utils';
import { type TicketDetail } from '@/types/check';
import { router } from '@inertiajs/react';
import { useEchoPublic } from '@laravel/echo-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export function useCheckTicket(initialTicketNumber: string, ticket: TicketDetail | null, flashSuccess?: string, accessCodeRequired: boolean = true) {
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

    const getStoredAccessCode = useCallback(() => {
        if (typeof window === 'undefined' || !ticket) return '';
        try {
            return sessionStorage.getItem(`ticket_access_code_${ticket.ticket_number}`) || '';
        } catch {
            return '';
        }
    }, [ticket]);

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

    function handleComplete(accessCodeOverride?: string, rating?: number | null, comment?: string | null) {
        if (!ticket) return;
        setCompleting(true);
        const code = accessCodeOverride || ticket.access_code || getStoredAccessCode() || '';

        if (code && typeof window !== 'undefined') {
            try {
                sessionStorage.setItem(`ticket_access_code_${ticket.ticket_number}`, code);
            } catch {
                //
            }
        }

        router.post(
            route('tickets.check.complete', { ticketNumber: ticket.ticket_number }),
            {
                access_code: accessCodeRequired ? code : code || null,
                rating: rating ?? null,
                comment: comment ?? null,
            },
            {
                preserveScroll: true,
                onFinish: () => setCompleting(false),
                onSuccess: () => {
                    setIsCompleteDialogOpen(false);
                    toast.success('Laporan telah ditandai selesai. Terima kasih!');
                },
                onError: () => {
                    toast.error(
                        accessCodeRequired
                            ? 'Gagal menyelesaikan laporan. Silakan periksa kembali kode akses.'
                            : 'Gagal menyelesaikan laporan. Silakan coba lagi.',
                    );
                },
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
