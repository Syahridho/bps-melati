import { AttachmentPreviewDialog, type AttachmentPreviewSource } from '@/components/attachment-preview-dialog';
import { LaporanMasukDeleteDialog } from '@/components/laporan-masuk-delete-dialog';
import { LaporanMasukDetailCard } from '@/components/laporan-masuk-detail-card';
import { LaporanMasukEditDialog } from '@/components/laporan-masuk-edit-dialog';
import { LaporanMasukResponseHistory } from '@/components/laporan-masuk-response-history';
import { useTicketRealtime } from '@/hooks/use-ticket-realtime';
import AdminPage from '@/pages/admin/page';
import { type Attachment, type ReplyConflict, type ShowProps, type Status, type TicketResponseItem } from '@/types/laporan-masuk';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export default function Show() {
    const { auth, ticket, can, from, flash } = usePage<ShowProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const isInputData = from === 'input-data' || ticket.source_app === 'admin';
    const backRouteName = isInputData ? `${routePrefix}.input-data.index` : `${routePrefix}.laporan-masuk.index`;
    const backLabel = isInputData ? 'Input Data' : 'Laporan Masuk';

    const canEdit = can?.edit ?? auth.user.role === 'admin';
    const canDelete = can?.delete ?? auth.user.role === 'admin';

    const [showReplyForm, setShowReplyForm] = useState(false);
    const [previewItem, setPreviewItem] = useState<AttachmentPreviewSource | null>(null);
    const [previewList, setPreviewList] = useState<AttachmentPreviewSource[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [responses, setResponses] = useState<TicketResponseItem[]>(ticket.responses);
    const [ticketStatus, setTicketStatus] = useState<Status>(ticket.status);
    const [ticketVersion, setTicketVersion] = useState<number>(ticket.version ?? 0);
    const [highlightLast, setHighlightLast] = useState(false);
    const [conflict, setConflict] = useState<ReplyConflict | null>(flash?.conflict ?? null);
    const [pendingNotice, setPendingNotice] = useState<string | null>(null);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const editForm = useForm({
        reporter_name: ticket.reporter_name ?? '',
        reporter_email: ticket.reporter_email ?? '',
        reporter_wa: ticket.reporter_wa ?? '',
        title: ticket.title ?? '',
        content: ticket.content ?? '',
    });

    useEffect(() => {
        if (flash?.success) {
            setSuccessMessage(flash.success);
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash?.success]);

    useEffect(() => {
        if (flash?.conflict) {
            setConflict(flash.conflict);
            setShowReplyForm(true);
        }
    }, [flash?.conflict]);

    useEffect(() => {
        setResponses(ticket.responses);
        setTicketStatus(ticket.status);
        setTicketVersion(ticket.version ?? 0);
    }, [ticket]);

    const responseCountRef = useRef(responses.length);
    responseCountRef.current = responses.length;

    const responsesAtFormOpen = useRef(responses.length);
    useEffect(() => {
        if (showReplyForm) {
            responsesAtFormOpen.current = responseCountRef.current;
            setPendingNotice(null);
        }
    }, [showReplyForm]);

    const handleIncomingResponse = useCallback((response: TicketResponseItem) => {
        setResponses((prev) => {
            if (prev.some((r) => r.id === response.id)) {
                return prev;
            }
            return [...prev, response];
        });

        setHighlightLast(true);
        window.setTimeout(() => setHighlightLast(false), 2000);

        setPendingNotice((current) => {
            if (responsesAtFormOpen.current >= responseCountRef.current) {
                return current;
            }
            return `Ada balasan baru dari ${response.user_name}.`;
        });
    }, []);

    const {
        viewers,
        typingName,
        broadcastTyping,
        version: liveVersion,
    } = useTicketRealtime({
        ticketId: ticket.id,
        currentUserId: auth.user.id,
        initialVersion: ticketVersion,
        currentUserName: auth.user.name,
        onResponse: handleIncomingResponse,
        onStatusChange: (status, version) => {
            setTicketStatus(status);
            setTicketVersion((prev) => Math.max(prev, version));
        },
        onCompleted: () => {
            // Pelapor menandai tiket selesai lewat /check. Jangan paksa pindah
            // halaman: petugas mungkin sedang membaca atau menulis balasan.
            setShowReplyForm(false);
            setPendingNotice(null);
            setSuccessMessage('Pelapor menandai laporan ini selesai.');
            toast.info('Pelapor menyelesaikan laporan ini', {
                description: 'Status berubah menjadi Selesai. Balasan baru tidak dapat dikirim.',
            });
        },
    });

    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();
        editForm.put(route(`${routePrefix}.laporan-masuk.update`, { ticketNumber: ticket.ticket_number }), {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditOpen(false);
                toast.success('Laporan berhasil diperbarui', {
                    position: 'bottom-right',
                });
            },
            onError: (errs) => {
                const firstError = Object.values(errs)[0];
                toast.error('Gagal memperbarui laporan', {
                    description: typeof firstError === 'string' ? firstError : 'Periksa kembali isian Anda.',
                    position: 'bottom-right',
                });
            },
        });
    };

    const handleDeleteSubmit = () => {
        setIsDeleting(true);
        router.delete(route(`${routePrefix}.laporan-masuk.destroy`, { ticketNumber: ticket.ticket_number }), {
            onFinish: () => setIsDeleting(false),
            onSuccess: () => {
                setIsDeleteOpen(false);
                toast.success('Laporan berhasil dihapus');
            },
            onError: () => {
                toast.error('Gagal menghapus laporan');
            },
        });
    };

    const handlePreviewAttachment = (attachment: Attachment, list: Attachment[] = []) => {
        setPreviewItem(attachment);
        setPreviewList(list);
    };

    const handlePreviewFile = (file: File, files: File[] = []) => {
        setPreviewItem(file);
        setPreviewList(files);
    };

    return (
        <AdminPage
            title={ticket.ticket_number}
            description="Detail laporan"
            breadcrumbs={[
                { title: backLabel, href: route(backRouteName) },
                { title: ticket.ticket_number, href: '#' },
            ]}
        >
            <div className="space-y-6">
                {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <Link
                        href={route(backRouteName)}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke {backLabel}
                    </Link>
                </div>

                <LaporanMasukDetailCard
                    ticket={ticket}
                    ticketStatus={ticketStatus}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEdit={() => setIsEditOpen(true)}
                    onDelete={() => setIsDeleteOpen(true)}
                    onPreviewAttachment={handlePreviewAttachment}
                />

                <LaporanMasukResponseHistory
                    responses={responses}
                    ticketId={ticket.id}
                    ticketStatus={ticketStatus}
                    expectedVersion={liveVersion}
                    routePrefix={routePrefix}
                    showReplyForm={showReplyForm}
                    viewers={viewers}
                    currentUserId={auth.user.id}
                    typingName={typingName}
                    pendingNotice={pendingNotice}
                    conflict={conflict}
                    onDismissConflict={() => setConflict(null)}
                    onToggleReply={() => setShowReplyForm((prev) => !prev)}
                    onCancelReply={() => setShowReplyForm(false)}
                    onReplySuccess={() => setShowReplyForm(false)}
                    onPreviewAttachment={handlePreviewAttachment}
                    onPreviewFile={handlePreviewFile}
                    onTyping={broadcastTyping}
                    highlightLast={highlightLast}
                />
            </div>

            {canEdit && (
                <LaporanMasukEditDialog
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    ticket={ticket}
                    data={editForm.data}
                    setData={editForm.setData}
                    errors={editForm.errors}
                    processing={editForm.processing}
                    onSubmit={handleEditSubmit}
                />
            )}

            {canDelete && (
                <LaporanMasukDeleteDialog
                    open={isDeleteOpen}
                    onOpenChange={setIsDeleteOpen}
                    ticket={ticket}
                    isDeleting={isDeleting}
                    onConfirm={handleDeleteSubmit}
                />
            )}

            <AttachmentPreviewDialog
                item={previewItem}
                items={previewList}
                onClose={() => {
                    setPreviewItem(null);
                    setPreviewList([]);
                }}
            />
        </AdminPage>
    );
}
