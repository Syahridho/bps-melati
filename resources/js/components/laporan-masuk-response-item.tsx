import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatFullDate, responseTypeLabel, responseTypeVariant } from '@/lib/laporan-masuk-utils';
import { cn } from '@/lib/utils';
import { type Attachment, type TicketResponseItem } from '@/types/laporan-masuk';
import { Paperclip, TimerOff } from 'lucide-react';

interface ResponseItemProps {
    response: TicketResponseItem;
    onPreviewAttachment: (attachment: Attachment, list?: Attachment[]) => void;
}

export function LaporanMasukResponseItem({ response, onPreviewAttachment }: ResponseItemProps) {
    const dateSource = response.sent_at || response.created_at;
    const isSystem = response.is_system === true;

    return (
        <div className={cn('space-y-2 rounded-lg border p-4', isSystem ? 'bg-muted/40 border-dashed' : 'bg-muted/20')}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-medium', isSystem && 'text-muted-foreground')}>
                        {isSystem && <TimerOff className="mr-1 inline size-3.5" />}
                        {response.user_name}
                    </span>
                    <Badge variant={responseTypeVariant(response.type)} className="text-[10px]">
                        {isSystem ? 'Otomatis' : responseTypeLabel(response.type)}
                    </Badge>
                </div>
                {dateSource && <span className="text-muted-foreground text-xs">{formatFullDate(dateSource)}</span>}
            </div>
            <p className={cn('text-sm whitespace-pre-wrap', isSystem && 'text-muted-foreground italic')}>{response.message}</p>
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
                                onClick={() => onPreviewAttachment(att, response.attachments)}
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

export { LaporanMasukResponseItem as ResponseItem };
