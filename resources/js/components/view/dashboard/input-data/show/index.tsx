import { AttachmentPreviewDialog, type AttachmentPreviewSource } from '@/components/shared/attachment-preview-dialog';
import { TicketFlagButton } from '@/components/shared/ticket-flag-button';
import { mapInputDataToDetailData } from '@/components/shared/ticket-detail/adapters';
import { TicketAttachments } from '@/components/shared/ticket-detail/ticket-attachments';
import { TicketContentCard } from '@/components/shared/ticket-detail/ticket-content-card';
import { TicketDetailHeader } from '@/components/shared/ticket-detail/ticket-detail-header';
import { TicketDetailLayout } from '@/components/shared/ticket-detail/ticket-detail-layout';
import { TicketEditDeleteActions } from '@/components/shared/ticket-detail/ticket-edit-delete-actions';
import { TicketInfoGrid } from '@/components/shared/ticket-detail/ticket-info-grid';
import { TicketResponseHistory } from '@/components/shared/ticket-detail/ticket-response-history';
import { Separator } from '@/components/ui/separator';
import InputDataDeleteTicketDialog from '@/components/view/dashboard/input-data/modal-delete-ticket';
import InputDataUpdateTicketDialog from '@/components/view/dashboard/input-data/modal-update-ticket';
import { useTicketRealtime } from '@/hooks/use-ticket-realtime';
import { formatFullDate } from '@/lib/laporan-masuk-utils';
import { type InputDataAttachment, type InputDataResponseItem, type InputDataShowProps, type StatusType } from '@/types/input-data';
import { router, useForm, usePage } from '@inertiajs/react';
import { Calendar, FileText, Globe, Layers, Mail, Phone, User } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

export default function ShowInputDataView() {
    const { auth, ticket, can, flash } = usePage<InputDataShowProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';
    const backRouteName = `${routePrefix}.input-data.index`;
    const backLabel = 'Input Data';

    const canEdit = can?.edit ?? true;
    const canDelete = can?.delete ?? true;

    const [previewItem, setPreviewItem] = useState<AttachmentPreviewSource | null>(null);
    const [previewList, setPreviewList] = useState<AttachmentPreviewSource[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [responses, setResponses] = useState<InputDataResponseItem[]>(ticket.responses);
    const [ticketStatus, setTicketStatus] = useState<StatusType>(ticket.status);
    const [ticketVersion, setTicketVersion] = useState<number>(ticket.version ?? 0);

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
        setResponses(ticket.responses);
        setTicketStatus(ticket.status);
        setTicketVersion(ticket.version ?? 0);
    }, [ticket]);

    useEffect(() => {
        const hasPendingEmail = responses.some((r) => r.email_status === 'pending');
        if (!hasPendingEmail) {
            return;
        }

        const startTime = Date.now();
        const maxDuration = 2 * 60 * 1000;

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

    const handleIncomingResponse = useCallback((response: InputDataResponseItem) => {
        setResponses((prev) => {
            if (prev.some((r) => r.id === response.id)) {
                return prev;
            }
            return [...prev, response];
        });
    }, []);

    useTicketRealtime({
        ticketId: ticket.id,
        currentUserId: auth.user.id,
        initialVersion: ticketVersion,
        currentUserName: auth.user.name,
        onResponse: (response) => {
            handleIncomingResponse({
                id: response.id,
                type: response.type,
                message: response.message,
                user_name: response.user_name,
                is_reporter: response.is_reporter,
                is_system: response.is_system,
                sent_at: response.sent_at,
                created_at: response.created_at,
                email_status: response.email_status as InputDataResponseItem['email_status'],
                email_sent_at: response.email_sent_at,
                email_failed_at: response.email_failed_at,
                email_error: response.email_error,
                attachments: response.attachments.map((att) => ({
                    id: att.id,
                    original_name: att.original_name,
                    mime_type: att.mime_type,
                    size: att.size,
                    url: att.url,
                })),
            });
        },
        onEmailStatusUpdate: (event) => {
            setResponses((prev) =>
                prev.map((r) =>
                    r.id === event.response_id
                        ? {
                              ...r,
                              email_status: event.email_status as InputDataResponseItem['email_status'],
                              email_sent_at: event.email_sent_at ?? null,
                              email_failed_at: event.email_failed_at ?? null,
                              email_error: event.email_error ?? null,
                          }
                        : r,
                ),
            );
        },
        onStatusChange: (status, version) => {
            setTicketStatus(status as StatusType);
            setTicketVersion((prev) => Math.max(prev, version));
        },
        onCompleted: () => {
            setSuccessMessage('Pelapor menandai laporan ini selesai.');
            toast.info('Pelapor menyelesaikan laporan ini', {
                description: 'Status berubah menjadi Selesai.',
            });
        },
    });

    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();
        editForm.put(route(`${routePrefix}.input-data.update`, { ticketNumber: ticket.ticket_number }), {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditOpen(false);
                toast.success('Data berhasil diperbarui', {
                    position: 'bottom-right',
                });
            },
            onError: (errs) => {
                const firstError = Object.values(errs)[0];
                toast.error('Gagal memperbarui data', {
                    description: typeof firstError === 'string' ? firstError : 'Periksa kembali isian Anda.',
                    position: 'bottom-right',
                });
            },
        });
    };

    const handleDeleteSubmit = () => {
        setIsDeleting(true);
        router.delete(route(`${routePrefix}.input-data.destroy`, { ticketNumber: ticket.ticket_number }), {
            onFinish: () => setIsDeleting(false),
            onSuccess: () => {
                setIsDeleteOpen(false);
                toast.success('Data berhasil dihapus');
            },
            onError: () => {
                toast.error('Gagal menghapus data');
            },
        });
    };

    const handlePreviewAttachment = (attachment: InputDataAttachment, list: InputDataAttachment[] = []) => {
        setPreviewItem(attachment);
        setPreviewList(list);
    };

    const detailData = mapInputDataToDetailData({
        ...ticket,
        status: ticketStatus,
        responses,
    });

    const infoFields = [
        {
            id: 'reporter',
            label: 'Pelapor / Sumber',
            value: detailData.reporter_name || '-',
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
        detailData.service_type
            ? {
                  id: 'service_type',
                  label: 'Jenis Layanan',
                  value: detailData.service_type,
                  icon: FileText,
              }
            : null,
        detailData.satuan_tugas
            ? {
                  id: 'satuan_tugas',
                  label: 'Satuan Tugas',
                  value: detailData.satuan_tugas,
                  icon: Layers,
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
                    tandaiRoute={route(`${routePrefix}.input-data.tandai`, ticket.ticket_number)}
                    variant="badge-button"
                />
            }
            dialogs={
                <>
                    <InputDataUpdateTicketDialog
                        setIsEditOpen={setIsEditOpen}
                        editForm={editForm}
                        isEditOpen={isEditOpen}
                        handleEditSubmit={handleEditSubmit}
                    />
                    <InputDataDeleteTicketDialog
                        isDeleteOpen={isDeleteOpen}
                        setIsDeleteOpen={setIsDeleteOpen}
                        isDeleting={isDeleting}
                        ticket={ticket}
                        handleDeleteSubmit={handleDeleteSubmit}
                    />
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
                    isPengawasan={false}
                    actions={
                        <TicketEditDeleteActions
                            canEdit={canEdit}
                            canDelete={canDelete}
                            onEdit={() => setIsEditOpen(true)}
                            onDelete={() => setIsDeleteOpen(true)}
                        />
                    }
                />

                <Separator />

                <TicketInfoGrid fields={infoFields} />

                <TicketContentCard title={detailData.title} content={detailData.content} />

                <TicketAttachments
                    attachments={detailData.attachments}
                    onPreview={(att) => handlePreviewAttachment(att, detailData.attachments)}
                />
            </div>

            <TicketResponseHistory
                responses={detailData.responses}
                ticketStatus={ticketStatus}
                readOnly={true}
                onPreviewAttachment={(att) => handlePreviewAttachment(att, detailData.attachments)}
            />
        </TicketDetailLayout>
    );
}
