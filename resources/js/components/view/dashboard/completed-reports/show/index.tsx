import CompletedStamp from '@/components/atoms/completed-stamp';
import { AttachmentPreviewDialog, type AttachmentPreviewSource } from '@/components/molecules/attachment-preview-dialog';
import { mapCompletedReportsToDetailData } from '@/components/organisms/ticket-detail/adapters';
import SensorToggleButton from '@/components/organisms/ticket-detail/sensor-toggle-button';
import { SupervisionToggle } from '@/components/organisms/ticket-detail/supervision-toggle';
import { TicketAttachments } from '@/components/organisms/ticket-detail/ticket-attachments';
import { TicketContentCard } from '@/components/organisms/ticket-detail/ticket-content-card';
import { TicketDetailHeader } from '@/components/organisms/ticket-detail/ticket-detail-header';
import { TicketDetailLayout } from '@/components/organisms/ticket-detail/ticket-detail-layout';
import { TicketInfoGrid } from '@/components/organisms/ticket-detail/ticket-info-grid';
import { TicketResponseHistory } from '@/components/organisms/ticket-detail/ticket-response-history';
import { TicketFlagButton } from '@/components/molecules/ticket-flag-button';
import { Separator } from '@/components/ui/separator';
import { formatFullDate } from '@/lib/incoming-reports-utils';
import { type Attachment, type ShowProps } from '@/types/completed-reports';
import { usePage } from '@inertiajs/react';
import { Calendar, Clock, FileText, Globe, Layers, Mail, Phone, User } from 'lucide-react';
import { useState } from 'react';

export default function ShowCompletedReportsView() {
    const { auth, ticket } = usePage<ShowProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const backRouteName = `${routePrefix}.completed-reports.index`;
    const backLabel = 'Laporan Selesai';

    const [previewItem, setPreviewItem] = useState<AttachmentPreviewSource | null>(null);
    const [previewList, setPreviewList] = useState<AttachmentPreviewSource[]>([]);
    const [showOriginal, setShowOriginal] = useState(false);

    const handlePreviewAttachment = (attachment: Attachment, list: Attachment[] = []) => {
        setPreviewItem(attachment);
        setPreviewList(list);
    };

    const detailData = mapCompletedReportsToDetailData(ticket);

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
            label: 'Sumber Kanal',
            value: detailData.channel,
            icon: Layers,
        },
        {
            id: 'created_at',
            label: 'Tanggal Dibuat',
            value: formatFullDate(detailData.created_at),
            icon: Calendar,
        },

        detailData.completed_at && detailData.created_at
            ? {
                  id: 'duration',
                  label: 'Durasi Penyelesaian',
                  value: (() => {
                      const start = new Date(detailData.created_at);
                      const end = new Date(detailData.completed_at);
                      const diffMs = end.getTime() - start.getTime();
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      if (diffDays > 0) return `${diffDays} hari ${diffHours} jam`;
                      if (diffHours > 0) return `${diffHours} jam ${diffMins} menit`;
                      return `${diffMins} menit`;
                  })(),
                  icon: Clock,
              }
            : null,
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
            headerActions={
                <>
                    <TicketFlagButton
                        ticket={ticket}
                        tandaiRoute={route(`${routePrefix}.completed-reports.tandai`, ticket.ticket_number)}
                        variant="badge-button"
                    />
                </>
            }
            dialogs={
                <AttachmentPreviewDialog
                    item={previewItem}
                    items={previewList}
                    onClose={() => {
                        setPreviewItem(null);
                        setPreviewList([]);
                    }}
                />
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
                            <SensorToggleButton showOriginal={showOriginal} onToggle={() => setShowOriginal((prev) => !prev)} />
                            <SupervisionToggle
                                ticketNumber={detailData.ticket_number}
                                isPengawasan={detailData.is_pengawasan}
                                disabled={true}
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
                {/* Completed stamp */}
                {detailData.completed_at && <CompletedStamp completedAt={detailData.completed_at} rating={detailData.rating} />}

                {(detailData.rating != null || (detailData.rating_comment && String(detailData.rating_comment).trim() !== '')) && (
                    <div className="mx-4 mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 sm:mx-6">
                        <h3 className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300">Penilaian Pelapor</h3>
                        {detailData.rating != null && (
                            <div className="mb-1 flex items-center gap-1" aria-label={`Rating ${detailData.rating} dari 5`}>
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <span
                                        key={value}
                                        className={
                                            value <= (detailData.rating ?? 0)
                                                ? 'text-[var(--rating-star)]'
                                                : 'text-muted-foreground/40'
                                        }
                                    >
                                        {value <= (detailData.rating ?? 0) ? '★' : '☆'}
                                    </span>
                                ))}
                            </div>
                        )}
                        {detailData.rated_at && (
                            <p className="text-muted-foreground mb-2 text-xs">{formatFullDate(detailData.rated_at)}</p>
                        )}
                        {(() => {
                            const commentText = showOriginal
                                ? detailData.rating_comment_original
                                : detailData.rating_comment;
                            if (!commentText || String(commentText).trim() === '') return null;
                            return <p className="text-foreground text-sm whitespace-pre-wrap">{commentText}</p>;
                        })()}
                    </div>
                )}

                <TicketContentCard
                    title={detailData.title}
                    content={detailData.content}
                    hasProfanity={detailData.has_profanity}
                    titleOriginal={detailData.title_original}
                    contentOriginal={detailData.content_original}
                    showOriginal={showOriginal}
                    onToggle={() => setShowOriginal((prev) => !prev)}
                />

                <TicketAttachments attachments={detailData.attachments} onPreview={(att) => handlePreviewAttachment(att, detailData.attachments)} />
            </div>

            <TicketResponseHistory
                responses={detailData.responses}
                ticketStatus={detailData.status}
                readOnly={true}
                showOriginal={showOriginal}
                onToggle={() => setShowOriginal((prev) => !prev)}
                onPreviewAttachment={(att) => handlePreviewAttachment(att, detailData.attachments)}
            />
        </TicketDetailLayout>
    );
}
