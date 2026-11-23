import { router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

interface EditableTicket {
    ticket_number: string;
    reporter_name?: string | null;
    reporter_email?: string | null;
    reporter_wa?: string | null;
    title?: string | null;
    content?: string | null;
}

interface Options {
    /** 'incoming-reports' | 'input-data' */
    routeSegment: string;
    /** 'Laporan' | 'Data' */
    noun: string;
}

export function useTicketEditDelete(ticket: EditableTicket, routePrefix: string, { routeSegment, noun }: Options) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const form = useForm({
        reporter_name: ticket.reporter_name ?? '',
        reporter_email: ticket.reporter_email ?? '',
        reporter_wa: ticket.reporter_wa ?? '',
        title: ticket.title ?? '',
        content: ticket.content ?? '',
    });

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        form.put(route(`${routePrefix}.${routeSegment}.update`, { ticketNumber: ticket.ticket_number }), {
            preserveScroll: true,
            onSuccess: () => {
                setEditOpen(false);
                toast.success(`${noun} berhasil diperbarui`, { position: 'bottom-right' });
            },
            onError: (errs) => {
                const first = Object.values(errs)[0];
                toast.error(`Gagal memperbarui ${noun.toLowerCase()}`, {
                    description: typeof first === 'string' ? first : 'Periksa kembali isian Anda.',
                    position: 'bottom-right',
                });
            },
        });
    };

    const confirmDelete = () => {
        setDeleting(true);
        router.delete(route(`${routePrefix}.${routeSegment}.destroy`, { ticketNumber: ticket.ticket_number }), {
            onFinish: () => setDeleting(false),
            onSuccess: () => {
                setDeleteOpen(false);
                toast.success(`${noun} berhasil dihapus`);
            },
            onError: () => toast.error(`Gagal menghapus ${noun.toLowerCase()}`),
        });
    };

    return { editOpen, setEditOpen, form, submitEdit, deleteOpen, setDeleteOpen, deleting, confirmDelete };
}
