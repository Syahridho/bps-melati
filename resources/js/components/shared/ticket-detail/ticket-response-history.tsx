import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageSquare, MessageSquareReply } from 'lucide-react';
import { ReactNode, RefObject } from 'react';
import { TicketResponseItem } from './ticket-response-item';
import { TicketAttachmentItem, TicketResponseEntry } from './types';

export interface TicketResponseHistoryProps {
    responses: TicketResponseEntry[];
    ticketStatus?: string;
    readOnly?: boolean;
    headerExtra?: ReactNode;
    footerExtra?: ReactNode;
    showReplyForm?: boolean;
    canResend?: boolean;
    reporterEmail?: string;
    onToggleReply?: () => void;
    onPreviewAttachment: (attachment: TicketAttachmentItem, list?: TicketAttachmentItem[]) => void;
    lastItemRef?: RefObject<HTMLDivElement | null>;
    getResendUrl?: (response: TicketResponseEntry) => string | undefined;
}

export function TicketResponseHistory({
    responses,
    ticketStatus,
    readOnly = false,
    headerExtra,
    footerExtra,
    showReplyForm = false,
    canResend = false,
    reporterEmail,
    onToggleReply,
    onPreviewAttachment,
    lastItemRef,
    getResendUrl,
}: TicketResponseHistoryProps) {
    const isCompleted = ticketStatus === 'selesai';

    return (
        <div className="bg-card space-y-4 rounded-lg border p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold">
                    <MessageSquare className="size-4" />
                    Riwayat Tanggapan({responses.length})
                </h3>

                {headerExtra}
            </div>

            {responses.length === 0 ? (
                <p className="text-muted-foreground text-sm">Belum ada tanggapan untuk laporan ini.</p>
            ) : (
                <div className="space-y-4">
                    {responses.map((response, index) => {
                        const isLast = index === responses.length - 1;

                        return (
                            <div key={response.id} ref={isLast ? lastItemRef : undefined}>
                                <TicketResponseItem
                                    response={response}
                                    onPreviewAttachment={onPreviewAttachment}
                                    resendUrl={
                                        canResend && (response.email_status === 'failed' || response.email_status === 'bounced') && getResendUrl
                                            ? getResendUrl(response)
                                            : undefined
                                    }
                                    reporterEmail={reporterEmail}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {!readOnly && !showReplyForm && onToggleReply && (
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

            {footerExtra}
        </div>
    );
}
