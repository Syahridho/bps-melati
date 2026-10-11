import { isImageFile, isPdfFile } from '@/lib/check-utils';
import { type TicketDetail } from '@/types/check';
import { useForm } from '@inertiajs/react';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';

export function useCheckReplyForm(ticket: TicketDetail | null) {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        message: '',
        attachments: [] as File[],
    });

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);

        const validFiles = newFiles.filter((file) => {
            const isLt2MB = file.size <= 2 * 1024 * 1024;
            const isValidType = isImageFile(file) || isPdfFile(file);
            return isLt2MB && isValidType;
        });

        const updated = [...data.attachments, ...validFiles].slice(0, 3);
        setData('attachments', updated);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function handleRemoveFile(index: number) {
        const updated = data.attachments.filter((_, i) => i !== index);
        setData('attachments', updated);
    }

    function handleSendReply(e: FormEvent) {
        e.preventDefault();
        if (!ticket) return;

        post(route('tickets.check.reply', { ticketNumber: ticket.ticket_number }), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setShowReplyForm(false);
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
        handleFileChange,
        handleRemoveFile,
        handleSendReply,
    };
}
