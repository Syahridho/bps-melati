import { isImageFile, isPdfFile } from '@/lib/check-utils';
import { type TicketDetail } from '@/types/check';
import { useForm } from '@inertiajs/react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'sonner';

const storageKey = (ticketNumber: string) => `ticket_access_code_${ticketNumber}`;

function readStoredAccessCode(ticketNumber?: string): string {
    if (typeof window === 'undefined' || !ticketNumber) return '';
    try {
        return sessionStorage.getItem(storageKey(ticketNumber)) || '';
    } catch {
        return '';
    }
}

function writeStoredAccessCode(ticketNumber: string, code: string) {
    if (typeof window === 'undefined' || !code) return;
    try {
        sessionStorage.setItem(storageKey(ticketNumber), code);
    } catch {
        // abaikan jika storage tidak tersedia
    }
}

export function useCheckReplyForm(ticket: TicketDetail | null, accessCodeRequired = true) {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        access_code: ticket?.access_code || readStoredAccessCode(ticket?.ticket_number),
        message: '',
        attachments: [] as File[],
    });

    // Sinkronkan access code saat tiket berganti
    useEffect(() => {
        if (!ticket) return;
        const code = ticket.access_code || readStoredAccessCode(ticket.ticket_number);
        if (code) {
            setData('access_code', code);
            writeStoredAccessCode(ticket.ticket_number, code);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticket?.ticket_number, ticket?.access_code]);

    const needsAccessCode = accessCodeRequired && !data.access_code.trim();

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);

        const validFiles = newFiles.filter((file) => {
            const isLt2MB = file.size <= 2 * 1024 * 1024;
            const isValidType = isImageFile(file) || isPdfFile(file);
            return isLt2MB && isValidType;
        });

        if (validFiles.length < newFiles.length) {
            toast.error('Sebagian file ditolak. Format JPG/PNG/PDF, maksimal 2MB per file.', {
                position: 'bottom-right',
            });
        }

        setData('attachments', [...data.attachments, ...validFiles].slice(0, 3));

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function handleRemoveFile(index: number) {
        setData(
            'attachments',
            data.attachments.filter((_, i) => i !== index),
        );
    }

    function handleSendReply(e: FormEvent) {
        e.preventDefault();
        if (!ticket) return;

        const accessCode = data.access_code.trim();
        if (accessCodeRequired && !accessCode) {
            toast.error('Masukkan access code tiket terlebih dahulu.', {
                position: 'bottom-right',
            });
            return;
        }

        transform((formData) => ({
            ...formData,
            access_code: accessCode,
            message: formData.message.trim(),
        }));

        post(route('tickets.check.reply', { ticketNumber: ticket.ticket_number }), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                writeStoredAccessCode(ticket.ticket_number, accessCode);
                reset('message', 'attachments');
                setShowReplyForm(false);
                toast.success('Balasan berhasil terkirim!', {
                    position: 'bottom-right',
                });
            },
            onError: (errs) => {
                const firstError = Object.values(errs)[0];
                toast.error(firstError || 'Gagal mengirim balasan. Silakan periksa kembali pesan Anda.', {
                    position: 'bottom-right',
                });
            },
        });
    }

    return {
        showReplyForm,
        setShowReplyForm,
        fileInputRef,
        data,
        setData,
        processing,
        errors,
        reset,
        needsAccessCode,
        handleFileChange,
        handleRemoveFile,
        handleSendReply,
    };
}
