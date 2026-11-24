import CompletedStamp from '@/components/atoms/completed-stamp';
import { AttachmentPreviewDialog } from '@/components/molecules/attachment-preview-dialog';
import { TicketFlagButton } from '@/components/molecules/ticket-flag-button';
import { mapCompletedReportsToDetailData } from '@/components/organisms/ticket-detail/adapters';
import { buildTicketInfoFields } from '@/components/organisms/ticket-detail/info-fields';
import { ReporterRatingCard } from '@/components/organisms/ticket-detail/reporter-rating-card';
import SensorToggleButton from '@/components/organisms/ticket-detail/sensor-toggle-button';
import { SupervisionToggle } from '@/components/organisms/ticket-detail/supervision-toggle';
import { TicketAttachments } from '@/components/organisms/ticket-detail/ticket-attachments';
import { TicketContentCard } from '@/components/organisms/ticket-detail/ticket-content-card';
import { TicketDetailHeader } from '@/components/organisms/ticket-detail/ticket-detail-header';
import { TicketDetailLayout } from '@/components/organisms/ticket-detail/ticket-detail-layout';
import { TicketInfoGrid } from '@/components/organisms/ticket-detail/ticket-info-grid';
import { TicketResponseHistory } from '@/components/organisms/ticket-detail/ticket-response-history';
import { Separator } from '@/components/ui/separator';
import { useAttachmentPreviewItem } from '@/hooks/use-attachment-preview-item';
import { type ShowProps } from '@/types/completed-reports';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function ShowCompletedReportsView() {
    const { auth, ticket } = usePage<ShowProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const [showOriginal, setShowOriginal] = useState(false);
    const toggleOriginal = () => setShowOriginal((prev) => !prev);

    const attachmentPreview = useAttachmentPreviewItem();

    const detailData = mapCompletedReportsToDetailData(ticket);
    const infoFields = buildTicketInfoFields(detailData, { showDuration: true });

    return (
        <TicketDetailLayout
            ticketNumber={ticket.ticket_number}
            backHref={route(`${routePrefix}.completed-reports.index`)}
            backLabel="Laporan Selesai"
            headerActions={
                <TicketFlagButton
                    ticket={ticket}
                    tandaiRoute={route(`${routePrefix}.completed-reports.tandai`, ticket.ticket_number)}
                    variant="badge-button"
                />
            }
            dialogs={<AttachmentPreviewDialog item={attachmentPreview.item} items={attachmentPreview.items} onClose={attachmentPreview.close} />}
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
                            {detailData.has_any_profanity && <SensorToggleButton showOriginal={showOriginal} onToggle={toggleOriginal} />}
                            <SupervisionToggle
                                ticketNumber={detailData.ticket_number}
                                isPengawasan={detailData.is_pengawasan}
                                disabled
                                kadarPengawasanDays={detailData.kadar_pengawasan_days}
                                classificationDefaultDays={detailData.classification_default_days}
                                updateRoute={route(`${routePrefix}.incoming-reports.pengawasan`, {
                                    ticketNumber: detailData.ticket_number,
                                })}
                            />
                        </>
                    }
                />

                <Separator />

                <TicketInfoGrid fields={infoFields} />

                {detailData.completed_at && <CompletedStamp completedAt={detailData.completed_at} rating={detailData.rating} />}

                <ReporterRatingCard
                    rating={detailData.rating}
                    ratedAt={detailData.rated_at}
                    comment={showOriginal ? detailData.rating_comment_original : detailData.rating_comment}
                />

                <TicketContentCard
                    title={detailData.title}
                    content={detailData.content}
                    hasProfanity={detailData.has_profanity}
                    titleOriginal={detailData.title_original}
                    contentOriginal={detailData.content_original}
                    showOriginal={showOriginal}
                    onToggle={toggleOriginal}
                />

                <TicketAttachments attachments={detailData.attachments} onPreview={(att) => attachmentPreview.preview(att, detailData.attachments)} />
            </div>

            <TicketResponseHistory
                responses={detailData.responses}
                ticketStatus={detailData.status}
                readOnly
                showOriginal={showOriginal}
                onToggle={toggleOriginal}
                onPreviewAttachment={(att) => attachmentPreview.preview(att, detailData.attachments)}
            />
        </TicketDetailLayout>
    );
}
