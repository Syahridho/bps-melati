import { AttachmentPreviewDialog, type AttachmentPreviewSource } from '@/components/attachment-preview-dialog';
import { LaporanMasukDeleteDialog } from '@/components/laporan-masuk-delete-dialog';
import { LaporanMasukDetailCard } from '@/components/laporan-masuk-detail-card';
import { LaporanMasukEditDialog } from '@/components/laporan-masuk-edit-dialog';
import { LaporanMasukResponseHistory } from '@/components/laporan-masuk-response-history';
import { ReplyCountdownBadge } from '@/components/reply-countdown-badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTicketRealtime } from '@/hooks/use-ticket-realtime';
import { cn } from '@/lib/utils';
import AdminPage from '@/pages/admin/page';
import { type Attachment, type ReplyConflict, type ShowProps, type Status, type TicketResponseItem } from '@/types/laporan-masuk';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Bookmark, CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export default function Show() {
    const { auth, ticket, can, from, flash, server_now } = usePage<ShowProps>().props;
    const routePrefix = auth.user.role === 'admin' 
        ? 'dashboard.admin' 
        : auth.user.role === 'operator_tim' 
        ? 'dashboard.operator-tim' 
        : 'dashboard.operator';

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
    const [bookmarkInfo, setBookmarkInfo] = useState(ticket.bookmark_info);

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
        setBookmarkInfo(ticket.bookmark_info);
    }, [ticket]);

    // Auto-refresh polling when there are responses with email_status === 'pending'
    useEffect(() => {
        const hasPendingEmail = responses.some((r) => r.email_status === 'pending');
        if (!hasPendingEmail) {
            return;
        }

        const startTime = Date.now();
        const maxDuration = 2 * 60 * 1000; // 2 minutes

        const interval = setInterval(() => {
            if (Date.now() - startTime >= maxDuration) {
                clearInterval(interval);
                return;
            }

            // Check if still has pending email in current responses
            const stillPending = responses.some((r) => r.email_status === 'pending');
            if (!stillPending) {
                clearInterval(interval);
                return;
            }

            router.reload({
                only: ['ticket'],
            });
        }, 4000);

        return () => {
            clearInterval(interval);
        };
    }, [responses]);

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
        onEmailStatusUpdate: (event) => {
            setResponses((prev) =>
                prev.map((r) =>
                    r.id === event.response_id
                        ? {
                              ...r,
                              email_status: event.email_status as TicketResponseItem['email_status'],
                              email_sent_at: event.email_sent_at ?? null,
                              email_failed_at: event.email_failed_at ?? null,
                              email_error: event.email_error ?? null,
                          }
                        : r,
                ),
            );
        },
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
        onBookmarkersChange: (event) => {
            setBookmarkInfo({
                by_me: Boolean(ticket.is_bookmarked),
                others: event.others,
                others_count: event.others_count,
            });
        },
    });

    const toggleBookmark = () => {
        const isBookmarked = ticket.is_bookmarked;
        const routeName = `${routePrefix}.laporan-masuk.bookmark.${isBookmarked ? 'destroy' : 'store'}`;
        const method = isBookmarked ? 'delete' : 'put';

        router[method](route(routeName, { ticketNumber: ticket.ticket_number }), {}, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                toast.success(isBookmarked ? 'Tanda dihapus' : 'Tiket ditandai');
            },
        });
    };

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

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href={route(backRouteName)}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke {backLabel}
                    </Link>
                    <div className="flex items-center gap-2">
                        {ticket.reply_deadline_at && (
                            <ReplyCountdownBadge
                                deadline={ticket.reply_deadline_at}
                                classification={ticket.classification}
                                serverNow={server_now}
                            />
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleBookmark}
                            className="gap-2"
                        >
                            <Bookmark className={cn('size-4', ticket.is_bookmarked && 'fill-primary text-primary')} />
                            {ticket.is_bookmarked ? 'Ditandai' : 'Tandai untuk nanti'}
                        </Button>
                    </div>
                </div>

                {bookmarkInfo && (bookmarkInfo.by_me || bookmarkInfo.others_count > 0) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-md border">
                        <Bookmark className="size-3.5 text-primary fill-primary shrink-0" />
                        <div>
                            {bookmarkInfo.by_me && <span className="font-medium text-foreground">Ditandai oleh Anda</span>}
                            {bookmarkInfo.by_me && bookmarkInfo.others_count > 0 && <span> • </span>}
                            {bookmarkInfo.others_count > 0 && (
                                <span>
                                    Juga ditandai oleh{' '}
                                    {bookmarkInfo.others_count === 1
                                        ? bookmarkInfo.others[0].name
                                        : bookmarkInfo.others_count === 2
                                        ? `${bookmarkInfo.others[0].name} dan ${bookmarkInfo.others[1].name}`
                                        : `${bookmarkInfo.others[0].name}, ${bookmarkInfo.others[1].name} dan ${bookmarkInfo.others_count - 2} lainnya`}
                                </span>
                            )}
                        </div>
                        {bookmarkInfo.others_count > 2 && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className="text-primary hover:underline font-medium ml-auto">Lihat semua</button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3 text-xs space-y-1">
                                    <p className="font-medium text-foreground mb-1">Petugas yang menandai:</p>
                                    {bookmarkInfo.others.map((o) => (
                                        <div key={o.id} className="text-muted-foreground">• {o.name}</div>
                                    ))}
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                )}

                <LaporanMasukDetailCard
                    ticket={ticket}
                    ticketStatus={ticketStatus}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    routePrefix={routePrefix}
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
                    canResend={auth.user.role === 'admin'}
                    reporterEmail={ticket.reporter_email ?? ''}
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
