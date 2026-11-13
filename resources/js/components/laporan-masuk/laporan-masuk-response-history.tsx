import { LaporanMasukPresenceBar } from '@/components/laporan-masuk/laporan-masuk-presence-bar';
import { LaporanMasukReplyForm } from '@/components/laporan-masuk/laporan-masuk-reply-form';
import { ResendForm } from '@/components/laporan-masuk/laporan-masuk-response-item';
import { EmailStatusBadge } from '@/components/laporan/email-status-badge';
import { Button } from '@/components/ui/button';
import { ChatThread, type ChatMessage } from '@/components/ui/chat-thread';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatFileSize, isImageMime, isPdfMime, responseTypeLabel } from '@/lib/laporan-masuk-utils';
import { type Attachment, type PresenceMember, type ReplyConflict, type Status, type TicketResponseItem } from '@/types/laporan-masuk';
import { AlertTriangle, Download, FileText, ImageIcon, MessageSquare, MessageSquareReply, Paperclip } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ResponseHistoryProps {
    responses: TicketResponseItem[];
    ticketId: number;
    ticketStatus: Status;
    expectedVersion: number;
    routePrefix: string;
    showReplyForm: boolean;
    viewers: PresenceMember[];
    currentUserId: number;
    typingName: string | null;
    pendingNotice: string | null;
    conflict: ReplyConflict | null;
    canResend?: boolean;
    reporterEmail?: string;
    onDismissConflict: () => void;
    onToggleReply: () => void;
    onCancelReply: () => void;
    onReplySuccess: () => void;
    onPreviewAttachment: (attachment: Attachment, list?: Attachment[]) => void;
    onPreviewFile: (file: File, files?: File[]) => void;
    onTyping: () => void;
    highlightLast?: boolean;
}

const TYPE_LABEL: Record<string, string> = {
    respon_awal: 'Respon Awal',
    respon_substantif: 'Respon Substantif',
};

const EMAIL_LABEL: Record<string, string> = {
    sent: 'Email terkirim',
    delivered: 'Email terkirim',
    failed: 'Email gagal',
    bounced: 'Email bounce',
};

export function LaporanMasukResponseHistory({
    responses,
    ticketId,
    ticketStatus,
    expectedVersion,
    routePrefix,
    showReplyForm,
    viewers,
    currentUserId,
    typingName,
    pendingNotice,
    conflict,
    canResend = false,
    reporterEmail,
    onDismissConflict,
    onToggleReply,
    onCancelReply,
    onReplySuccess,
    onPreviewAttachment,
    onPreviewFile,
    onTyping,
    highlightLast = false,
}: ResponseHistoryProps) {
    const lastItemRef = useRef<HTMLDivElement>(null);
    const isCompleted = ticketStatus === 'selesai';
    const hasResponAwal =
        responses.some((response) => response.type === 'respon_awal') ||
        ticketStatus === 'respon_awal' ||
        ticketStatus === 'respon_substantif' ||
        ticketStatus === 'selesai';

    useEffect(() => {
        if (!highlightLast || !lastItemRef.current) {
            return;
        }

        lastItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [highlightLast, responses.length]);

    /**
     * PEMETAAN data -> bubble. Hanya bagian ini yang bergantung pada nama field.
     * ASUMSI (sesuaikan dengan TicketResponseItem):
     *  - pelapor        : response.type === 'balasan_pelapor'
     *  - isi pesan      : response.message
     *  - waktu          : response.created_at
     *  - nama petugas   : response.user?.name
     *  - lampiran       : response.attachments (punya .id dan .name)
     *  - status email   : response.email_status
     */
    const toChatMessage = (response: TicketResponseItem): ChatMessage => {
        const isReporter = response.is_reporter === true;
        const isSystem = response.is_system === true;
        const showEmailWarning = !isReporter && (response.email_status === 'failed' || response.email_status === 'bounced');
        const resendUrl =
            canResend && showEmailWarning
                ? route('dashboard.admin.laporan-masuk.responses.resend', { ticket: ticketId, response: response.id })
                : undefined;
        const attachments = response.attachments ?? [];

        return {
            id: response.id,
            side: isReporter ? 'reporter' : 'officer',
            senderName: response.user_name,
            badge: isSystem ? 'Otomatis' : responseTypeLabel(response.type),
            body: response.message,
            createdAt: response.sent_at || response.created_at || '',
            muted: isSystem,
            meta:
                response.email_status && !isReporter ? (
                    <EmailStatusBadge
                        status={response.email_status}
                        sentAt={response.email_sent_at}
                        failedAt={response.email_failed_at}
                        error={response.email_error}
                    />
                ) : undefined,
            notice: showEmailWarning ? (
                <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                    <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                            Pelapor kemungkinan tidak menerima balasan ini. Hubungi pelapor lewat kanal lain (telepon/WhatsApp), atau perbarui email
                            pelapor dan kirim ulang.
                        </span>
                    </div>
                    {resendUrl && <ResendForm url={resendUrl} currentEmail={reporterEmail ?? ''} />}
                </div>
            ) : undefined,
            attachments:
                attachments.length > 0
                    ? attachments.map((att) => (
                          <div key={att.id} className="bg-background text-foreground flex items-center rounded-md border">
                              <button
                                  type="button"
                                  onClick={() => onPreviewAttachment(att, attachments)}
                                  className="hover:bg-accent flex min-w-0 items-center gap-1.5 rounded-l-md py-1.5 pr-1.5 pl-2 text-xs transition-colors"
                              >
                                  {isImageMime(att.mime_type, att.original_name) ? (
                                      <ImageIcon className="size-3 shrink-0 text-blue-500" />
                                  ) : isPdfMime(att.mime_type, att.original_name) ? (
                                      <FileText className="size-3 shrink-0 text-red-500" />
                                  ) : (
                                      <Paperclip className="text-muted-foreground size-3 shrink-0" />
                                  )}
                                  <span className="max-w-[150px] truncate">{att.original_name}</span>
                                  {att.size ? <span className="text-muted-foreground text-[10px]">{formatFileSize(att.size)}</span> : null}
                              </button>
                              <a
                                  href={att.url}
                                  download
                                  aria-label={`Unduh ${att.original_name}`}
                                  className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded-r-md border-l p-1.5 transition-colors"
                              >
                                  <Download className="size-3.5" />
                              </a>
                          </div>
                      ))
                    : undefined,
        };
    };
    console.log(viewers);

    return (
        <div className="bg-card space-y-4 rounded-lg border p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold">
                    <MessageSquare className="size-4" />
                    Riwayat Tanggapan({responses.length})
                </h3>

                <LaporanMasukPresenceBar viewers={viewers} currentUserId={currentUserId} typingName={typingName} className="min-w-0" />
            </div>

            <ChatThread
                messages={responses.map(toChatMessage)}
                lastMessageRef={lastItemRef}
                emptyState={<p className="text-muted-foreground text-sm">Belum ada tanggapan untuk laporan ini.</p>}
            />

            {!showReplyForm && (
                <div className="pt-1">
                    {isCompleted ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="inline-flex w-full sm:w-auto">
                                        <Button type="button" variant="outline" className="w-full sm:w-auto" disabled>
                                            <MessageSquareReply className="mr-1.5 size-4" />
                                            Balas
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Tiket sudah selesai dan tidak dapat dibalas.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onToggleReply}>
                            <MessageSquareReply className="mr-1.5 size-4" />
                            Balas
                        </Button>
                    )}
                </div>
            )}

            <LaporanMasukReplyForm
                ticketId={ticketId}
                ticketStatus={ticketStatus}
                expectedVersion={expectedVersion}
                hasResponAwal={hasResponAwal}
                routePrefix={routePrefix}
                open={showReplyForm && !isCompleted}
                pendingNotice={pendingNotice}
                conflict={conflict}
                onDismissConflict={onDismissConflict}
                onCancel={onCancelReply}
                onSuccess={onReplySuccess}
                onPreviewFile={onPreviewFile}
                onTyping={onTyping}
                viewers={viewers}
                currentUserId={currentUserId}
                typingName={typingName}
            />
        </div>
    );
}

export { LaporanMasukResponseHistory as ResponseHistory };
