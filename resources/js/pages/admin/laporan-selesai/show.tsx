import { AttachmentPreviewDialog, type AttachmentPreviewSource } from '@/components/attachment-preview-dialog';
import { LaporanMasukDetailCard } from '@/components/laporan-masuk-detail-card';
import { LaporanMasukResponseHistory } from '@/components/laporan-masuk-response-history';
import AdminPage from '@/pages/admin/page';
import { type Attachment, type ShowProps } from '@/types/laporan-selesai';
import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export default function Show() {
    const { auth, ticket, server_now } = usePage<ShowProps>().props;
    const routePrefix = auth.user.role === 'admin' 
        ? 'dashboard.admin' 
        : auth.user.role === 'operator_tim' 
        ? 'dashboard.operator-tim' 
        : 'dashboard.operator';

    const backRouteName = `${routePrefix}.laporan-selesai.index`;
    const backLabel = 'Laporan Selesai';

    const [previewItem, setPreviewItem] = useState<AttachmentPreviewSource | null>(null);
    const [previewList, setPreviewList] = useState<AttachmentPreviewSource[]>([]);

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
            description="Detail laporan selesai"
            breadcrumbs={[
                { title: backLabel, href: route(backRouteName) },
                { title: ticket.ticket_number, href: '#' },
            ]}
        >
            <div className="space-y-6">
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
                    ticketStatus={ticket.status}
                    serverNow={server_now ?? new Date().toISOString()}
                    canEdit={false}
                    canDelete={false}
                    routePrefix={routePrefix}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onPreviewAttachment={handlePreviewAttachment}
                />

                <LaporanMasukResponseHistory
                    responses={ticket.responses}
                    ticketId={ticket.id}
                    ticketStatus={ticket.status}
                    expectedVersion={ticket.version ?? 0}
                    routePrefix={routePrefix}
                    showReplyForm={false}
                    viewers={[]}
                    currentUserId={auth.user.id}
                    typingName={null}
                    pendingNotice={null}
                    conflict={null}
                    onDismissConflict={() => {}}
                    onToggleReply={() => {}}
                    onCancelReply={() => {}}
                    onReplySuccess={() => {}}
                    onPreviewAttachment={handlePreviewAttachment}
                    onPreviewFile={handlePreviewFile}
                    onTyping={() => {}}
                    highlightLast={false}
                />
            </div>

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
