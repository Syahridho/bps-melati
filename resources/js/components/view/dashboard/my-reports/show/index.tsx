import CompletedStamp from '@/components/atoms/completed-stamp';
import { AttachmentPreviewDialog } from '@/components/molecules/attachment-preview-dialog';
import { IncomingReportsPresenceBar } from '@/components/molecules/incoming-reports-presence-bar';
import { TicketFlagButton } from '@/components/molecules/ticket-flag-button';
import { IncomingReportsDeleteDialog } from '@/components/organisms/incoming-reports/incoming-reports-delete-dialog';
import { IncomingReportsEditDialog } from '@/components/organisms/incoming-reports/incoming-reports-edit-dialog';
import { IncomingReportsReplyForm } from '@/components/organisms/incoming-reports/incoming-reports-reply-form';
import { TicketAssignmentBadges } from '@/components/organisms/incoming-reports/ticket-assignment-badges';
import { TicketAssignmentHistory } from '@/components/organisms/incoming-reports/ticket-assignment-history';
import { TicketClaimButton } from '@/components/organisms/incoming-reports/ticket-claim-button';
import { TicketReassignDialog } from '@/components/organisms/incoming-reports/ticket-reassign-dialog';
import { mapIncomingReportsToDetailData } from '@/components/organisms/ticket-detail/adapters';
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
import { resolveBackTarget } from '@/lib/incoming-reports-nav';
import { resolveTicketPermissions } from '@/lib/ticket-permissions';
import { type ReplyConflict, type ShowProps } from '@/types/incoming-reports';
import { usePage } from '@inertiajs/react';
import { UserRoundCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function ShowMyReportView() {
    const {
        auth,
        ticket,
        can,
        flash,
        assignableOperators = [],
        assignmentLogs = [],
        activeAssignmentMode = 'free',
        from,
    } = usePage<ShowProps>().props;
    const { url } = usePage();
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const back = resolveBackTarget({ from, url, routePrefix });
    const perms = resolveTicketPermissions(can, auth.user.role);

    const [showReplyForm, setShowReplyForm] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);
    const [isReassignOpen, setIsReassignOpen] = useState(false);
    const [conflict, setConflict] = useState<ReplyConflict | null>(flash?.conflict ?? null);
    const toggleOriginal = () => setShowOriginal((prev) => !prev);

    const preview = useAttachmentPreviewItem();
    const flashMessage = useFlashMessage(flash?.success);
    const editDelete = useTicketEditDelete(ticket, routePrefix, { routeSegment: 'incoming-reports', noun: 'Laporan' });

    const live = useTicketLive({
        ticket,
        user: auth.user,
        showReplyForm,
        onCompleted: () => {
            setShowReplyForm(false);
            flashMessage.show('Pelapor menandai laporan ini selesai.');
            toast.info('Pelapor menyelesaikan laporan ini', {
                description: 'Status berubah menjadi Selesai. Balasan baru tidak dapat dikirim.',
            });
        },
    });

    useEffect(() => {
        if (flash?.conflict) {
            setConflict(flash.conflict);
            setShowReplyForm(true);
        }
    }, [flash?.conflict]);

    const detailData = mapIncomingReportsToDetailData({
        ...ticket,
        status: live.status,
        completed_at: live.completedAt,
        responses: live.responses,
    });

    const hasResponAwal =
        live.responses.some((r) => r.type === 'respon_awal') ||
        live.status === 'respon_awal' ||
        live.status === 'respon_substantif' ||
        live.status === 'selesai';

    const previewAttachment = (att: Parameters<typeof preview.preview>[0]) => preview.preview(att, detailData.attachments);

    return (
        <TicketDetailLayout
            ticketNumber={ticket.ticket_number}
            backHref={back.href}
            backLabel={back.label}
            successMessage={flashMessage.message}
            headerActions={
                <TicketFlagButton
                    ticket={ticket}
                    tandaiRoute={route(`${routePrefix}.incoming-reports.tandai`, ticket.ticket_number)}
                    variant="badge-button"
                />
            }
            dialogs={
                <>
                    {perms.edit && (
                        <IncomingReportsEditDialog
                            open={editDelete.editOpen}
                            onOpenChange={editDelete.setEditOpen}
                            ticket={ticket}
                            data={editDelete.form.data}
                            setData={editDelete.form.setData}
                            errors={editDelete.form.errors}
                            processing={editDelete.form.processing}
                            onSubmit={editDelete.submitEdit}
                        />
                    )}

                    {perms.delete && (
                        <IncomingReportsDeleteDialog
                            open={editDelete.deleteOpen}
                            onOpenChange={editDelete.setDeleteOpen}
                            ticket={ticket}
                            isDeleting={editDelete.deleting}
                            onConfirm={editDelete.confirmDelete}
                        />
                    )}

                    {perms.reassign && (
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
                        />
                    }
                    actions={
                        <>
                            {perms.claim && <TicketClaimButton ticketId={ticket.id} />}
                            {perms.reassign && (
                                <Button type="button" variant="outline" onClick={() => setIsReassignOpen(true)} className="gap-2">
                                    <UserRoundCog className="size-4" />
                                    Ubah PIC
                                </Button>
                            )}
                            {detailData.has_any_profanity && <SensorToggleButton showOriginal={showOriginal} onToggle={toggleOriginal} />}
                            <SupervisionToggle
                                ticketNumber={detailData.ticket_number}
                                isPengawasan={detailData.is_pengawasan}
                                disabled={live.status === 'selesai'}
                                kadarPengawasanDays={detailData.kadar_pengawasan_days}
                                classificationDefaultDays={detailData.classification_default_days}
                                updateRoute={route(`${routePrefix}.incoming-reports.pengawasan`, {
                                    ticketNumber: detailData.ticket_number,
                                })}
                            />
                            <TicketEditDeleteActions
                                canEdit={perms.edit}
                                canDelete={perms.delete}
                                onEdit={() => editDelete.setEditOpen(true)}
                                onDelete={() => editDelete.setDeleteOpen(true)}
                            />
                        </>
                    }
                />

                <Separator />

                <TicketInfoGrid fields={buildTicketInfoFields(detailData)} />

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

            {perms.viewAssignmentHistory && <TicketAssignmentHistory logs={assignmentLogs} />}

            <TicketResponseHistory
                responses={detailData.responses}
                ticketStatus={live.status}
                readOnly={false}
                showReplyForm={showReplyForm}
                canResend={auth.user.role === 'admin'}
                reporterEmail={ticket.reporter_email ?? ''}
                onToggleReply={perms.reply ? () => setShowReplyForm((prev) => !prev) : undefined}
                onPreviewAttachment={previewAttachment}
                lastItemRef={live.lastItemRef}
                headerExtra={
                    <IncomingReportsPresenceBar
                        viewers={live.viewers}
                        currentUserId={auth.user.id}
                        typingNames={live.typingNames}
                        className="min-w-0"
                    />
                }
                getResendUrl={(response) => route('dashboard.admin.incoming-reports.responses.resend', { ticket: ticket.id, response: response.id })}
                showOriginal={showOriginal}
                onToggle={toggleOriginal}
                footerExtra={
                    perms.reply ? (
                        <IncomingReportsReplyForm
                            ticketId={ticket.id}
                            ticketStatus={live.status}
                            expectedVersion={live.liveVersion}
                            hasResponAwal={hasResponAwal}
                            routePrefix={routePrefix}
                            open={showReplyForm && live.status !== 'selesai'}
                            pendingNotice={live.pendingNotice}
                            conflict={conflict}
                            onDismissConflict={() => setConflict(null)}
                            onCancel={() => setShowReplyForm(false)}
                            onSuccess={() => setShowReplyForm(false)}
                            onPreviewFile={preview.preview}
                            onTyping={live.broadcastTyping}
                            currentUserId={auth.user.id}
                            viewers={live.viewers}
                            typingNames={live.typingNames}
                        />
                    ) : undefined
                }
            />
        </TicketDetailLayout>
    );
}
