import { LaporanMasukPresenceBar } from '@/components/laporan-masuk-presence-bar';
import { LaporanMasukReplyForm } from '@/components/laporan-masuk-reply-form';
import { LaporanMasukResponseItem } from '@/components/laporan-masuk-response-item';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type Attachment, type PresenceMember, type ReplyConflict, type Status, type TicketResponseItem } from '@/types/laporan-masuk';
import { MessageSquare, MessageSquareReply } from 'lucide-react';
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
    const hasResponAwal = responses.some((r) => r.type === 'respon_awal');

    useEffect(() => {
        if (highlightLast && lastItemRef.current) {
            lastItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [highlightLast]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <MessageSquare className="size-5 text-primary" />
                    <h3 className="font-semibold text-lg">Riwayat Tanggapan & Percakapan</h3>
                </div>

                <LaporanMasukPresenceBar viewers={viewers} currentUserId={currentUserId} typingName={typingName} />
            </div>

            <div className="space-y-4">
                {responses.map((response, index) => {
                    const isLast = index === responses.length - 1;
                    return (
                        <div key={response.id} ref={isLast && highlightLast ? lastItemRef : null}>
                            <LaporanMasukResponseItem
                                response={response}
                                routePrefix={routePrefix}
                                canResend={canResend}
                                reporterEmail={reporterEmail}
                                onPreviewAttachment={onPreviewAttachment}
                            />
                        </div>
                    );
                })}

                {responses.length === 0 && (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                        Belum ada tanggapan pada laporan ini.
                    </div>
                )}
            </div>

            {!showReplyForm && (
                <div className="flex justify-end pt-2">
                    {isCompleted ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span tabIndex={0} className="inline-block">
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
            />
        </div>
    );
}

export { LaporanMasukResponseHistory as ResponseHistory };
