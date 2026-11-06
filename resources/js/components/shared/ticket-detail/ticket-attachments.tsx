import { Separator } from '@/components/ui/separator';
import { formatFileSize, isImageMime, isPdfMime } from '@/lib/laporan-masuk-utils';
import { Download, FileText, ImageIcon, Paperclip } from 'lucide-react';
import { TicketAttachmentItem } from './types';

export interface TicketAttachmentsProps {
    attachments: TicketAttachmentItem[];
    onPreview: (attachment: TicketAttachmentItem, list: TicketAttachmentItem[]) => void;
}

export function TicketAttachments({ attachments, onPreview }: TicketAttachmentsProps) {
    if (!attachments || attachments.length === 0) {
        return null;
    }

    return (
        <>
            <Separator />
            <div className="px-4 py-4 sm:px-6">
                <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
                    Lampiran ({attachments.length})
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {attachments.map((att) => (
                        <div
                            key={att.id}
                            className="bg-muted/40 hover:bg-muted/80 flex items-center gap-2 rounded-md border p-2.5 transition-colors"
                        >
                            <button
                                type="button"
                                onClick={() => onPreview(att, attachments)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                                <div className="bg-background shrink-0 rounded p-1.5 shadow-xs">
                                    {isImageMime(att.mime_type, att.original_name) ? (
                                        <ImageIcon className="size-4 text-blue-500" />
                                    ) : isPdfMime(att.mime_type, att.original_name) ? (
                                        <FileText className="size-4 text-red-500" />
                                    ) : (
                                        <Paperclip className="text-muted-foreground size-4" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium">{att.original_name}</p>
                                    {att.size ? <p className="text-muted-foreground text-[10px]">{formatFileSize(att.size)}</p> : null}
                                </div>
                            </button>
                            <a
                                href={att.url}
                                download
                                aria-label={`Unduh ${att.original_name}`}
                                title="Unduh lampiran"
                                className="text-muted-foreground hover:text-foreground hover:bg-background shrink-0 rounded p-1.5 transition-colors"
                            >
                                <Download className="size-4" />
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
