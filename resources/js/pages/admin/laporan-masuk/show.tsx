import { AttachmentPreviewDialog, type AttachmentPreviewSource } from '@/components/attachment-preview-dialog';
import { LaporanMasukDeleteDialog } from '@/components/laporan-masuk-delete-dialog';
import { LaporanMasukDetailCard } from '@/components/laporan-masuk-detail-card';
import { LaporanMasukEditDialog } from '@/components/laporan-masuk-edit-dialog';
import { LaporanMasukResponseHistory } from '@/components/laporan-masuk-response-history';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTicketRealtime } from '@/hooks/use-ticket-realtime';
import AdminPage from '@/pages/admin/page';
import { type Attachment, type ReplyConflict, type ShowProps, type Status, type TicketDetail, type TicketResponseItem } from '@/types/laporan-masuk';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Clock, Flag, LoaderCircle, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

function DetailFlagButton({ ticket, routePrefix }: { ticket: TicketDetail; routePrefix: string }) {
    const [flagged, setFlagged] = useState(ticket.is_flagged ?? false);
    const [note, setNote] = useState(ticket.flag_note ?? '');
    const [flagNote, setFlagNote] = useState(ticket.flag_note ?? '');
    const [flaggedByName, setFlaggedByName] = useState(ticket.flagged_by_name ?? '');
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const { auth } = usePage<{ auth: { user: { name: string } } }>().props;

    const handleToggle = async () => {
        if (flagged) {
            setFlagged(false);
            setFlagNote('');
            setFlaggedByName('');
            setProcessing(true);
            try {
                const res = await fetch(route(`${routePrefix}.laporan-masuk.tandai`, ticket.ticket_number), {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                        Accept: 'application/json',
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ aktif: false }),
                });
                if (!res.ok) throw new Error();
                toast.success('Tandai berhasil dilepas');
            } catch {
                setFlagged(true);
                setFlagNote(ticket.flag_note ?? '');
                setFlaggedByName(ticket.flagged_by_name ?? '');
                toast.error('Gagal melepas tandai');
            } finally {
                setProcessing(false);
            }
        } else {
            setOpen(true);
        }
    };

    const handleFlag = async () => {
        setFlagged(true);
        setFlagNote(note);
        setFlaggedByName(auth.user.name);
        setOpen(false);
        setProcessing(true);
        try {
            const res = await fetch(route(`${routePrefix}.laporan-masuk.tandai`, ticket.ticket_number), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ aktif: true, note: note || null }),
            });
            if (!res.ok) throw new Error();
            toast.success('Laporan berhasil ditandai');
        } catch {
            setFlagged(false);
            setFlagNote('');
            setFlaggedByName('');
            toast.error('Gagal menandai laporan');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {flagged && (
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="outline" className="border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                <Flag className="mr-1 size-3 fill-orange-500" />
                                Ditandai
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                            <p className="text-xs">
                                Ditandai oleh {flaggedByName || 'Petugas'}
                                {flagNote && <span className="block mt-1 text-muted-foreground">"{flagNote}"</span>}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            {flagged ? (
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleToggle}
                    disabled={processing}
                    aria-label="Lepas tandai"
                >
                    <Flag className="mr-1.5 size-4 fill-orange-500 text-orange-500" />
                    Lepas Tandai
                </Button>
            ) : (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpen(true)}
                            disabled={processing}
                            aria-label="Tandai laporan"
                        >
                            <Flag className="mr-1.5 size-4" />
                            Tandai
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="end">
                        <div className="space-y-3">
                            <p className="text-sm font-medium">Tandai Laporan</p>
                            <Textarea
                                placeholder="Catatan alasan (opsional, maks 255 karakter)"
                                maxLength={255}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="min-h-[60px] text-sm"
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                                    Batal
                                </Button>
                                <Button size="sm" onClick={handleFlag} disabled={processing}>
                                    Tandai
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}

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
    const [isPengawasanModalOpen, setIsPengawasanModalOpen] = useState(false);
    const [pendingPengawasanValue, setPendingPengawasanValue] = useState<boolean | null>(null);
    const [isProcessingPengawasan, setIsProcessingPengawasan] = useState(false);

    const handleTogglePengawasanAttempt = (aktif: boolean) => {
        setPendingPengawasanValue(aktif);
        setIsPengawasanModalOpen(true);
    };

    const handleConfirmPengawasan = () => {
        if (pendingPengawasanValue === null) {
            return;
        }
        setIsProcessingPengawasan(true);
        router.patch(
            route(`${routePrefix}.laporan-masuk.pengawasan`, { ticketNumber: ticket.ticket_number }),
            { aktif: pendingPengawasanValue },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsPengawasanModalOpen(false);
                    toast.success(pendingPengawasanValue ? 'Kadar pengawasan berhasil diaktifkan' : 'Kadar pengawasan berhasil dinonaktifkan', {
                        position: 'bottom-right',
                    });
                },
                onError: (errs) => {
                    const firstError = Object.values(errs)[0];
                    toast.error('Gagal mengubah kadar pengawasan', {
                        description: typeof firstError === 'string' ? firstError : 'Terjadi kesalahan.',
                        position: 'bottom-right',
                    });
                },
                onFinish: () => {
                    setIsProcessingPengawasan(false);
                    setPendingPengawasanValue(null);
                },
            },
        );
    };

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
                preserveScroll: true,
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
            // title={ticket.ticket_number}
            // description="Detail laporan"
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
                    <DetailFlagButton ticket={ticket} routePrefix={routePrefix} />
                </div>

                <LaporanMasukDetailCard
                    ticket={ticket}
                    ticketStatus={ticketStatus}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEdit={() => setIsEditOpen(true)}
                    onDelete={() => setIsDeleteOpen(true)}
                    onPreviewAttachment={handlePreviewAttachment}
                    onTogglePengawasan={handleTogglePengawasanAttempt}
                    processingPengawasan={isProcessingPengawasan}
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

            <Dialog open={isPengawasanModalOpen} onOpenChange={setIsPengawasanModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <ShieldAlert className="size-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-semibold">
                                    {pendingPengawasanValue ? 'Aktifkan Kadar Pengawasan?' : 'Nonaktifkan Kadar Pengawasan?'}
                                </DialogTitle>
                                <p className="text-muted-foreground text-xs">{ticket.ticket_number}</p>
                            </div>
                        </div>
                    </DialogHeader>

                    <DialogDescription asChild>
                        <div className="space-y-3 pt-2 text-sm text-foreground">
                            <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Batas auto close saat ini:</span>
                                    <span className="font-semibold text-foreground">
                                        {pendingPengawasanValue ? `${ticket.classification_default_days} hari` : `${ticket.kadar_pengawasan_days} hari`}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Batas auto close setelah diubah:</span>
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                        {pendingPengawasanValue ? `${ticket.kadar_pengawasan_days} hari` : `${ticket.classification_default_days} hari`}
                                    </span>
                                </div>
                            </div>

                            <p className="text-muted-foreground text-xs leading-relaxed">
                                {pendingPengawasanValue
                                    ? `Tiket ini akan diberi waktu respon lebih lama (${ticket.kadar_pengawasan_days} hari tanpa balasan pelapor) sebelum ditutup otomatis oleh sistem.`
                                    : `Batas waktu auto close akan dikembalikan ke default (${ticket.classification_default_days} hari).`}
                            </p>
                        </div>
                    </DialogDescription>

                    <DialogFooter className="gap-2 pt-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsPengawasanModalOpen(false)}
                            disabled={isProcessingPengawasan}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            className={pendingPengawasanValue ? 'bg-amber-600 text-white hover:bg-amber-700' : ''}
                            onClick={handleConfirmPengawasan}
                            disabled={isProcessingPengawasan}
                        >
                            {isProcessingPengawasan ? (
                                <>
                                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : pendingPengawasanValue ? (
                                'Ya, Aktifkan'
                            ) : (
                                'Ya, Nonaktifkan'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
