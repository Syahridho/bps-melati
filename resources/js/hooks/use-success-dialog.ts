import { useCallback, useState } from 'react';

export function useSuccessDialog() {
    const [showDialog, setShowDialog] = useState(false);
    const [ticketNumber, setTicketNumber] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const openSuccessDialog = useCallback((num: string) => {
        setTicketNumber(num);
        setShowDialog(true);
    }, []);

    function handleCopy() {
        if (ticketNumber) {
            navigator.clipboard.writeText(ticketNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    function handleDialogClose() {
        setShowDialog(false);
        setTicketNumber(null);
    }

    return {
        showDialog,
        ticketNumber,
        copied,
        openSuccessDialog,
        handleCopy,
        handleDialogClose,
    };
}
