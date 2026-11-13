import { LaporanMasukDeleteDialog } from '@/components/laporan-masuk/laporan-masuk-delete-dialog';
import { LaporanMasukEditDialog } from '@/components/laporan-masuk/laporan-masuk-edit-dialog';
import { LaporanMasukPresenceBar } from '@/components/laporan-masuk/laporan-masuk-presence-bar';
import { LaporanMasukReplyForm } from '@/components/laporan-masuk/laporan-masuk-reply-form';
import { AttachmentPreviewDialog, type AttachmentPreviewSource } from '@/components/shared/attachment-preview-dialog';
import { mapLaporanMasukToDetailData } from '@/components/shared/ticket-detail/adapters';
import { SupervisionToggle } from '@/components/shared/ticket-detail/supervision-toggle';
import { TicketAttachments } from '@/components/shared/ticket-detail/ticket-attachments';
import { TicketContentCard } from '@/components/shared/ticket-detail/ticket-content-card';
import { TicketDetailHeader } from '@/components/shared/ticket-detail/ticket-detail-header';
import { TicketDetailLayout } from '@/components/shared/ticket-detail/ticket-detail-layout';
import { TicketEditDeleteActions } from '@/components/shared/ticket-detail/ticket-edit-delete-actions';
import { TicketInfoGrid } from '@/components/shared/ticket-detail/ticket-info-grid';
import { TicketResponseHistory } from '@/components/shared/ticket-detail/ticket-response-history';
import { TicketFlagButton } from '@/components/shared/ticket-flag-button';
import { Separator } from '@/components/ui/separator';
import { useTicketRealtime } from '@/hooks/use-ticket-realtime';
import { formatFullDate } from '@/lib/laporan-masuk-utils';
import { type Attachment, type ReplyConflict, type ShowProps, type Status, type TicketResponseItem } from '@/types/laporan-masuk';
import { router, useForm, usePage } from '@inertiajs/react';
import { Calendar, FileText, Globe, Layers, Mail, Phone, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export default function ShowLaporanMasukView() {
    const { auth, ticket, can, flash } = usePage<ShowProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const backRouteName = `${routePrefix}.laporan-masuk.index`;
    const backLabel = 'Laporan Masuk';

    const canEdit = can?.edit ?? auth.user.role === 'admin';
    const canDelete = can?.delete ?? auth.user.role === 'admin';

    const [showReplyForm, setShowReplyForm] = useState(false);
    const [previewItem, setPreviewItem] = useState<AttachmentPreviewSource | null>(null);
    const [previewList, setPreviewList] = useState<AttachmentPreviewSource[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const flashSuccessRef = useRef<string | null>(null);
    const flashTimerRef = useRef<number | null>(null);
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
        const message = flash?.success ?? null;
        if (!message || message === flashSuccessRef.current) {
            return;
        }

        if (flashTimerRef.current !== null) {
            window.clearTimeout(flashTimerRef.current);
        }

        flashSuccessRef.current = message;
        setSuccessMessage(message);
        flashTimerRef.current = window.setTimeout(() => {
            setSuccessMessage(null);
            flashSuccessRef.current = null;
            flashTimerRef.current = null;
        }, 5000);

        return () => {
            if (flashTimerRef.current !== null) {
                window.clearTimeout(flashTimerRef.current);
                flashTimerRef.current = null;
            }
        };
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

    const lastItemRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!highlightLast || !lastItemRef.current) {
            return;
        }

        lastItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [highlightLast, responses.length]);

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

    const detailData = mapLaporanMasukToDetailData({
        ...ticket,
        status: ticketStatus,
        responses,
    });

    const hasResponAwal =
        responses.some((response) => response.type === 'respon_awal') ||
        ticketStatus === 'respon_awal' ||
        ticketStatus === 'respon_substantif' ||
        ticketStatus === 'selesai';

    const infoFields = [
        {
            id: 'reporter',
            label: 'Pelapor',
            value: detailData.reporter_name ?? 'Anonim',
            icon: User,
        },
        detailData.reporter_email
            ? {
                  id: 'email',
                  label: 'Email',
                  value: detailData.reporter_email,
                  icon: Mail,
                  className: 'min-[1280px]:max-[1399px]:col-span-2',
              }
            : null,
        detailData.reporter_wa
            ? {
                  id: 'wa',
                  label: 'WhatsApp',
                  value: detailData.reporter_wa,
                  icon: Phone,
              }
            : null,
        {
            id: 'source',
            label: 'Sumber / Aplikasi',
            value: <span className="capitalize">{detailData.source_app}</span>,
            icon: Globe,
        },
        {
            id: 'channel',
            label: 'Channel',
            value: detailData.channel,
            icon: Layers,
        },
        {
            id: 'created_at',
            label: 'Tanggal Dibuat',
            value: formatFullDate(detailData.created_at),
            icon: Calendar,
        },
        {
            id: 'sequence',
            label: 'Nomor Urut',
            value: detailData.sequence,
            icon: FileText,
        },
        detailData.created_by_name
            ? {
                  id: 'created_by',
                  label: 'Dibuat Oleh',
                  value: detailData.created_by_name,
                  icon: User,
              }
            : null,
    ];

    return (
        <TicketDetailLayout
            ticketNumber={ticket.ticket_number}
            backHref={route(backRouteName)}
            backLabel={backLabel}
            successMessage={successMessage}
            headerActions={
                <TicketFlagButton
                    ticket={ticket}
                    tandaiRoute={route(`${routePrefix}.laporan-masuk.tandai`, ticket.ticket_number)}
                    variant="badge-button"
                />
            }
            dialogs={
                <>
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
                </>
            }
        >
            <div className="bg-card rounded-lg border">
                <TicketDetailHeader
                    ticketNumber={detailData.ticket_number}
                    classification={detailData.classification}
                    status={detailData.status}
                    createdAt={detailData.created_at}
                    autoCloseAt={detailData.auto_close_at}
                    isPengawasan={detailData.is_pengawasan}
                    pengawasanAt={detailData.pengawasan_at}
                    pengawasanByName={detailData.pengawasan_by_name}
                    kadarPengawasanDays={detailData.kadar_pengawasan_days}
                    actions={
                        <>
                            <SupervisionToggle
                                ticketNumber={detailData.ticket_number}
                                isPengawasan={detailData.is_pengawasan}
                                disabled={ticketStatus === 'selesai'}
                                kadarPengawasanDays={detailData.kadar_pengawasan_days}
                                classificationDefaultDays={detailData.classification_default_days}
                                updateRoute={route(`${routePrefix}.laporan-masuk.pengawasan`, {
                                    ticketNumber: detailData.ticket_number,
                                })}
                            />
                            <TicketEditDeleteActions
                                canEdit={canEdit}
                                canDelete={canDelete}
                                onEdit={() => setIsEditOpen(true)}
                                onDelete={() => setIsDeleteOpen(true)}
                            />
                        </>
                    }
                />

                <Separator />

                <TicketInfoGrid fields={infoFields} />

                <TicketContentCard title={detailData.title} content={detailData.content} />

                <TicketAttachments attachments={detailData.attachments} onPreview={(att) => handlePreviewAttachment(att, detailData.attachments)} />
            </div>

            <TicketResponseHistory
                responses={detailData.responses}
                ticketStatus={ticketStatus}
                readOnly={false}
                showReplyForm={showReplyForm}
                canResend={auth.user.role === 'admin'}
                reporterEmail={ticket.reporter_email ?? ''}
                onToggleReply={() => setShowReplyForm((prev) => !prev)}
                onPreviewAttachment={(att) => handlePreviewAttachment(att, detailData.attachments)}
                lastItemRef={lastItemRef}
                headerExtra={<LaporanMasukPresenceBar viewers={viewers} currentUserId={auth.user.id} typingName={typingName} className="min-w-0" />}
                getResendUrl={(response) =>
                    route('dashboard.admin.laporan-masuk.responses.resend', {
                        ticket: ticket.id,
                        response: response.id,
                    })
                }
                footerExtra={
                    <LaporanMasukReplyForm
                        ticketId={ticket.id}
                        ticketStatus={ticketStatus}
                        expectedVersion={liveVersion}
                        hasResponAwal={hasResponAwal}
                        routePrefix={routePrefix}
                        open={showReplyForm && ticketStatus !== 'selesai'}
                        pendingNotice={pendingNotice}
                        conflict={conflict}
                        onDismissConflict={() => setConflict(null)}
                        onCancel={() => setShowReplyForm(false)}
                        onSuccess={() => setShowReplyForm(false)}
                        onPreviewFile={handlePreviewFile}
                        onTyping={broadcastTyping}
                        currentUserId={auth.user.id}
                        viewers={viewers}
                        typingName={typingName}
                    />
                }
            />
        </TicketDetailLayout>
    );
}
