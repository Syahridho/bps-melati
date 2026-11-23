import { useEffect, useState } from 'react';

import { getStoredAccessCode, storeAccessCode } from '@/lib/ticket-access-code';

export function useCompleteForm(open: boolean, ticketNumber?: string, defaultAccessCode = '') {
    const [accessCode, setAccessCode] = useState(defaultAccessCode);
    const [rating, setRating] = useState<number | null>(null);
    const [comment, setComment] = useState('');

    // isi kode akses saat dialog dibuka
    useEffect(() => {
        if (defaultAccessCode) setAccessCode(defaultAccessCode);
        else if (ticketNumber) setAccessCode(getStoredAccessCode(ticketNumber) || '');
    }, [defaultAccessCode, ticketNumber, open]);

    // reset isian saat ditutup
    useEffect(() => {
        if (!open) {
            setRating(null);
            setComment('');
        }
    }, [open]);

    const persistAccessCode = () => {
        if (ticketNumber && accessCode) storeAccessCode(ticketNumber, accessCode);
    };

    return { accessCode, setAccessCode, rating, setRating, comment, setComment, persistAccessCode };
}
