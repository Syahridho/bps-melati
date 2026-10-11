import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Paperclip } from 'lucide-react';
import { type Attachment, type TicketResponseItem } from './types';
import { formatFullDate, responseTypeLabel, responseTypeVariant } from './utils';

interface ResponseItemProps {
    response: TicketResponseItem;
    onPreviewAttachment: (attachment: Attachment) => void;
}

export function ResponseItem({ response, onPreviewAttachment }: ResponseItemProps) {
    const dateSource = response.sent_at || response.created_at;

    return (
        <div className="bg-muted/20 space-y-2 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{response.user_name}</span>
                    <Badge variant={responseTypeVariant(response.type)} className="text-[10px]">
                        {responseTypeLabel(response.type)}
                    </Badge>
                </div>
                {dateSource && <span className="text-muted-foreground text-xs">{formatFullDate(dateSource)}</span>}
            </div>
            <p className="text-sm whitespace-pre-wrap">{response.message}</p>
            {response.attachments && response.attachments.length > 0 && (
                <div className="pt-2">
                    <p className="text-muted-foreground mb-1 text-xs font-medium">Lampiran:</p>
                    <div className="flex flex-wrap gap-2">
                        {response.attachments.map((att) => (
                            <Button
                                key={att.id}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 text-xs"
                                onClick={() => onPreviewAttachment(att)}
                            >
                                <Paperclip className="size-3" />
                                <span className="max-w-[150px] truncate">{att.original_name}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
