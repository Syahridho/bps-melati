import CompletedStamp from '@/components/atoms/completed-stamp';
import { AttachmentPreviewDialog } from '@/components/molecules/attachment-preview-dialog';
import { TicketFlagButton } from '@/components/molecules/ticket-flag-button';
import { IncomingReportsReplyForm } from '@/components/organisms/incoming-reports/incoming-reports-reply-form';
import { TicketAssignmentBadges } from '@/components/organisms/incoming-reports/ticket-assignment-badges';
import { TicketAssignmentHistory } from '@/components/organisms/incoming-reports/ticket-assignment-history';
import { TicketReassignDialog } from '@/components/organisms/incoming-reports/ticket-reassign-dialog';
import { mapInputDataToDetailData } from '@/components/organisms/ticket-detail/adapters';
import { buildTicketInfoFields } from '@/components/organisms/ticket-detail/info-fields';
import SensorToggleButton from '@/components/organisms/ticket-detail/sensor-toggle-button';
import { SupervisionToggle } from '@/components/organisms/ticket-detail/supervision-toggle';
import { TicketAttachments } from '@/components/organisms/ticket-detail/ticket-attachments';
import { TicketContentCard } from '@/components/organisms/ticket-detail/ticket-content-card';
import { TicketDetailHeader } from '@/components/organisms/ticket-detail/ticket-detail-header';
import { TicketDetailLayout } from '@/components/organisms/ticket-detail/ticket-detail-layout';
import { TicketEditDeleteActions } from '@/components/organisms/ticket-detail/ticket-edit-delete-actions';
import { TicketInfoGrid } from '@/components/organisms/ticket-detail/ticket-info-grid';
import { TicketResponseHistory } from '@/components/organisms/ticket-detail/ticket-response-history';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAttachmentPreviewItem } from '@/hooks/use-attachment-preview-item';
import { useFlashMessage } from '@/hooks/use-flash-message';
import { useTicketEditDelete } from '@/hooks/use-ticket-edit-delete';
import { useTicketLive } from '@/hooks/use-ticket-live';
import { type InputDataShowProps } from '@/types/input-data';
import { usePage } from '@inertiajs/react';
import { Reply, UserRoundCog } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import InputDataDeleteTicketDialog from '@/components/view/dashboard/input-data/delete-ticket-dialog';
import InputDataUpdateTicketDialog from '@/components/view/dashboard/input-data/update-ticket-dialog';

export default function ShowInputDataView() {
    const { auth, ticket, can, flash, assignableOperators = [], assignmentLogs = [], activeAssignmentMode = 'free' } = usePage<InputDataShowProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';
    const isAdmin = auth.user.role === 'admin';

    const canEdit = can?.edit ?? true;
    const canDelete = can?.delete ?? true;
    const canReply = Boolean(can?.reply);
    const canReassign = can?.reassign ?? isAdmin;
    const canViewAssignmentHistory = can?.view_assignment_history ?? isAdmin;

    const [showReplyForm, setShowReplyForm] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);
    const [isReassignOpen, setIsReassignOpen] = useState(false);
    const toggleOriginal = () => setShowOriginal((prev) => !prev);

    const preview = useAttachmentPreviewItem();
    const flashMessage = useFlashMessage(flash?.success);
    const editDelete = useTicketEditDelete(ticket, routePrefix, { routeSegment: 'input-data', noun: 'Data' });

    const live = useTicketLive({
        ticket: ticket as never, // lihat catatan tipe di bawah
        user: auth.user,
        showReplyForm,
        onCompleted: () => {
            flashMessage.show('Pelapor menandai laporan ini selesai.');
            toast.info('Pelapor menyelesaikan laporan ini', { description: 'Status berubah menjadi Selesai.' });
        },
    });

    const detailData = mapInputDataToDetailData({
        ...ticket,
        status: live.status,
        completed_at: live.completedAt,
        responses: live.responses as never,
    });

    const hasResponAwal =
        detailData.responses.some((r) => r.type === 'respon_awal') ||
        live.status === 'respon_awal' ||
        live.status === 'respon_substantif' ||
        live.status === 'selesai';

    const showHandledByOtherNotice =
        !canReply &&
        !isAdmin &&
        live.status !== 'selesai' &&
        Boolean(detailData.assigned_to_name) &&
        Number(detailData.assigned_to) !== Number(auth.user.id);

    const previewAttachment = (att: Parameters<typeof preview.preview>[0]) => preview.preview(att, detailData.attachments);

    return (
        <TicketDetailLayout
            ticketNumber={ticket.ticket_number}
            backHref={route(`${routePrefix}.input-data.index`)}
            backLabel="Input Data"
            successMessage={flashMessage.message}
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
                        setIsEditOpen={editDelete.setEditOpen}
                        editForm={editDelete.form}
                        isEditOpen={editDelete.editOpen}
                        handleEditSubmit={editDelete.submitEdit}
                    />
                    <InputDataDeleteTicketDialog
                        isDeleteOpen={editDelete.deleteOpen}
                        setIsDeleteOpen={editDelete.setDeleteOpen}
                        isDeleting={editDelete.deleting}
                        ticket={ticket}
                        handleDeleteSubmit={editDelete.confirmDelete}
                    />
                    {canReassign && (
                        <TicketReassignDialog
                            open={isReassignOpen}
                            onOpenChange={setIsReassignOpen}
                            ticketId={ticket.id}
                            currentPicId={ticket.assigned_to ?? null}
                            operators={assignableOperators}
                        />
                    )}
                    <AttachmentPreviewDialog item={preview.item} items={preview.items} onClose={preview.close} />
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
                    badges={
                        <TicketAssignmentBadges
                            assignedToName={detailData.assigned_to_name}
                            assignmentMode={detailData.assignment_mode}
                            activeAssignmentMode={activeAssignmentMode}
                            isOrphaned={detailData.is_orphaned}
                            showUnassigned
                            alwaysShowMode
                        />
                    }
                    actions={
                        <>
                            {canReassign && (
                                <Button type="button" variant="outline" onClick={() => setIsReassignOpen(true)} className="gap-2">
                                    <UserRoundCog className="size-4" />
                                    Ubah PIC
                                </Button>
                            )}
                            {detailData.has_any_profanity && <SensorToggleButton showOriginal={showOriginal} onToggle={toggleOriginal} />}
                            <SupervisionToggle
                                ticketNumber={detailData.ticket_number}
                                isPengawasan={detailData.is_pengawasan}
                                disabled={live.status === 'selesai' || auth.user.role === 'operator_tim'}
                                kadarPengawasanDays={detailData.kadar_pengawasan_days}
                                classificationDefaultDays={detailData.classification_default_days}
                                updateRoute={route(`${routePrefix}.input-data.pengawasan`, { ticketNumber: detailData.ticket_number })}
                            />
                            <TicketEditDeleteActions
                                canEdit={canEdit}
                                canDelete={canDelete}
                                onEdit={() => editDelete.setEditOpen(true)}
                                onDelete={() => editDelete.setDeleteOpen(true)}
                            />
                        </>
                    }
                />

                <Separator />

                <TicketInfoGrid
                    fields={buildTicketInfoFields(detailData, {
                        reporterLabel: 'Pelapor / Sumber',
                        reporterFallback: '-',
                        showServiceInfo: true,
                    })}
                />

                {live.status === 'selesai' && live.completedAt && <CompletedStamp completedAt={live.completedAt} rating={live.rating} />}

                <TicketContentCard
                    title={detailData.title}
                    content={detailData.content}
                    hasProfanity={detailData.has_profanity}
                    titleOriginal={detailData.title_original}
                    contentOriginal={detailData.content_original}
                    showOriginal={showOriginal}
                    onToggle={toggleOriginal}
                />

                <TicketAttachments attachments={detailData.attachments} onPreview={previewAttachment} />
            </div>

            {canViewAssignmentHistory && <TicketAssignmentHistory logs={assignmentLogs} />}

            <TicketResponseHistory
                responses={detailData.responses}
                ticketStatus={live.status}
                readOnly
                onPreviewAttachment={previewAttachment}
                showOriginal={showOriginal}
                onToggle={toggleOriginal}
                footerExtra={
                    canReply ? (
                        <>
                            {!showReplyForm && live.status !== 'selesai' && (
                                <Button onClick={() => setShowReplyForm(true)}>
                                    <Reply className="mr-2 h-4 w-4" />
                                    Balas Laporan
                                </Button>
                            )}
                            <IncomingReportsReplyForm
                                ticketId={ticket.id}
                                ticketStatus={live.status}
                                expectedVersion={ticket.version}
                                hasResponAwal={hasResponAwal}
                                routePrefix={routePrefix}
                                open={showReplyForm && live.status !== 'selesai'}
                                pendingNotice={null}
                                conflict={null}
                                onDismissConflict={() => {}}
                                onCancel={() => setShowReplyForm(false)}
                                onSuccess={() => setShowReplyForm(false)}
                                onPreviewFile={() => {}}
                                onTyping={() => {}}
                                currentUserId={auth.user.id}
                            />
                        </>
                    ) : showHandledByOtherNotice ? (
                        <p className="text-muted-foreground text-sm">
                            Laporan ini ditangani oleh <span className="text-foreground font-medium">{detailData.assigned_to_name}</span>.
                        </p>
                    ) : undefined
                }
            />
        </TicketDetailLayout>
    );
}
