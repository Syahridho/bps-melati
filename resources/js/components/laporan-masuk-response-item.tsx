import { EmailStatusBadge } from '@/components/laporan/email-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatFileSize, formatFullDate, isImageMime, isPdfMime, responseTypeLabel, responseTypeVariant } from '@/lib/laporan-masuk-utils';
import { cn } from '@/lib/utils';
import { type Attachment, type TicketResponseItem } from '@/types/laporan-masuk';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, Download, FileText, ImageIcon, Paperclip, RefreshCw, TimerOff } from 'lucide-react';

interface ResponseItemProps {
    response: TicketResponseItem;
    onPreviewAttachment: (attachment: Attachment, list?: Attachment[]) => void;
    resendUrl?: string;
    reporterEmail?: string;
}

export function LaporanMasukResponseItem({ response, onPreviewAttachment, resendUrl, reporterEmail }: ResponseItemProps) {
    const dateSource = response.sent_at || response.created_at;
    const isSystem = response.is_system === true;
    const showEmailWarning = response.email_status === 'failed' || response.email_status === 'bounced';

    return (
        <div className={cn('space-y-2 rounded-lg border p-4', isSystem ? 'bg-muted/40 border-dashed' : 'bg-muted/20')}>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className={cn('text-sm font-medium break-words', isSystem && 'text-muted-foreground')}>
                        {isSystem && <TimerOff className="mr-1 inline size-3.5" />}
                        {response.user_name}
                    </span>
                    <Badge variant={responseTypeVariant(response.type)} className="text-[10px]">
                        {isSystem ? 'Otomatis' : responseTypeLabel(response.type)}
                    </Badge>
                </div>
                {dateSource && (
                    <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                        <span>{formatFullDate(dateSource)}</span>
                        {response.email_status && !response.is_reporter && (
                            <>
                                <span className="hidden sm:inline">·</span>
                                <EmailStatusBadge
                                    status={response.email_status}
                                    sentAt={response.email_sent_at}
                                    failedAt={response.email_failed_at}
                                    error={response.email_error}
                                />
                            </>
                        )}
                    </div>
                )}
            </div>
            <p className={cn('text-sm whitespace-pre-wrap', isSystem && 'text-muted-foreground italic')}>{response.message}</p>

            {/* Peringatan email gagal/bounce + tombol kirim ulang */}
            {showEmailWarning && (
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
            )}

            {response.attachments && response.attachments.length > 0 && (
                <div className="pt-2">
                    <p className="text-muted-foreground mb-1 text-xs font-medium">Lampiran:</p>
                    <div className="flex flex-wrap gap-2">
                        {response.attachments.map((att) => (
                            <div key={att.id} className="bg-background flex items-center rounded-md border">
                                <button
                                    type="button"
                                    onClick={() => onPreviewAttachment(att, response.attachments)}
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
                                    title="Unduh lampiran"
                                    className="text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 rounded-r-md border-l p-1.5 transition-colors"
                                >
                                    <Download className="size-3.5" />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ResendForm({ url, currentEmail }: { url: string; currentEmail: string }) {
    const { data, setData, post, processing, errors } = useForm({
        reporter_email: currentEmail,
    });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                post(url, { preserveScroll: true });
            }}
            className="flex flex-wrap items-start gap-2"
        >
            <div className="min-w-[14rem] flex-1">
                <Input
                    type="email"
                    placeholder="Email pelapor baru"
                    value={data.reporter_email}
                    onChange={(e) => setData('reporter_email', e.target.value)}
                    className="h-8 text-xs"
                />
                {errors.reporter_email && <p className="text-destructive mt-1 text-[10px]">{errors.reporter_email}</p>}
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={processing} className="h-8 gap-1.5 text-xs">
                <RefreshCw className={cn('size-3', processing && 'animate-spin')} />
                Kirim ulang email
            </Button>
        </form>
    );
}
