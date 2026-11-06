import { AttachmentPreviewDialog, type AttachmentPreviewSource } from '@/components/shared/attachment-preview-dialog';
import { TicketFlagButton } from '@/components/shared/ticket-flag-button';
import { mapLaporanSelesaiToDetailData } from '@/components/shared/ticket-detail/adapters';
import { SupervisionToggle } from '@/components/shared/ticket-detail/supervision-toggle';
import { TicketAttachments } from '@/components/shared/ticket-detail/ticket-attachments';
import { TicketContentCard } from '@/components/shared/ticket-detail/ticket-content-card';
import { TicketDetailHeader } from '@/components/shared/ticket-detail/ticket-detail-header';
import { TicketDetailLayout } from '@/components/shared/ticket-detail/ticket-detail-layout';
import { TicketInfoGrid } from '@/components/shared/ticket-detail/ticket-info-grid';
import { TicketResponseHistory } from '@/components/shared/ticket-detail/ticket-response-history';
import { Separator } from '@/components/ui/separator';
import { formatFullDate } from '@/lib/laporan-masuk-utils';
import { type Attachment, type ShowProps } from '@/types/laporan-selesai';
import { usePage } from '@inertiajs/react';
import { Calendar, FileText, Globe, Layers, Mail, Phone, User } from 'lucide-react';
import { useState } from 'react';

export default function ShowLaporanSelesaiView() {
    const { auth, ticket } = usePage<ShowProps>().props;
    const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';

    const backRouteName = `${routePrefix}.laporan-selesai.index`;
    const backLabel = 'Laporan Selesai';

    const [previewItem, setPreviewItem] = useState<AttachmentPreviewSource | null>(null);
    const [previewList, setPreviewList] = useState<AttachmentPreviewSource[]>([]);

    const handlePreviewAttachment = (attachment: Attachment, list: Attachment[] = []) => {
        setPreviewItem(attachment);
        setPreviewList(list);
    };

    const detailData = mapLaporanSelesaiToDetailData(ticket);

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
            headerActions={
                <TicketFlagButton
                    ticket={ticket}
                    tandaiRoute={route(`${routePrefix}.laporan-selesai.tandai`, ticket.ticket_number)}
                    variant="badge-button"
                />
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
                        <SupervisionToggle
                            ticketNumber={detailData.ticket_number}
                            isPengawasan={detailData.is_pengawasan}
                            disabled={true}
                            kadarPengawasanDays={detailData.kadar_pengawasan_days}
                            classificationDefaultDays={detailData.classification_default_days}
                            updateRoute={route(`${routePrefix}.laporan-masuk.pengawasan`, {
                                ticketNumber: detailData.ticket_number,
                            })}
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
                ticketStatus={detailData.status}
                readOnly={true}
                onPreviewAttachment={(att) => handlePreviewAttachment(att, detailData.attachments)}
            />
        </TicketDetailLayout>
    );
}
