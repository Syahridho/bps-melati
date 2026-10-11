import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageSquare, MessageSquareReply } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { PresenceBar } from './presence-bar';
import { type ReplyConflict } from './realtime-types';
import { ReplyForm } from './reply-form';
import { ResponseItem } from './response-item';
import { type Attachment, type PresenceMember, type Status, type TicketResponseItem } from './types';

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
    onDismissConflict: () => void;
    onToggleReply: () => void;
    onCancelReply: () => void;
    onReplySuccess: () => void;
    onPreviewAttachment: (attachment: Attachment, list?: Attachment[]) => void;
    onPreviewFile: (file: File, files?: File[]) => void;
    onTyping: () => void;
    highlightLast?: boolean;
}

export function ResponseHistory({
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

    return (
        <div className="bg-card space-y-4 rounded-lg border p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold">
                    <MessageSquare className="size-4" />
                    Riwayat Tanggapan ({responses.length})
                </h3>

                <PresenceBar viewers={viewers} currentUserId={currentUserId} typingName={typingName} />
            </div>

            {responses.length === 0 ? (
                <p className="text-muted-foreground text-sm">Belum ada tanggapan untuk laporan ini.</p>
            ) : (
                <div className="space-y-4">
                    {responses.map((response, index) => {
                        const isLast = index === responses.length - 1;

                        return (
                            <div key={response.id} ref={isLast ? lastItemRef : undefined}>
                                <ResponseItem response={response} onPreviewAttachment={onPreviewAttachment} />
                            </div>
                        );
                    })}
                </div>
            )}

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

            <ReplyForm
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
