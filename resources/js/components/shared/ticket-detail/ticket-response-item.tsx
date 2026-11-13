import { EmailStatusBadge } from '@/components/laporan/email-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatFileSize, formatFullDate, isImageMime, isPdfMime, responseTypeLabel, responseTypeVariant } from '@/lib/laporan-masuk-utils';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, Download, FileText, ImageIcon, Paperclip, RefreshCw, TimerOff } from 'lucide-react';
import { TicketAttachmentItem, TicketResponseEntry } from './types';

export interface TicketResponseItemProps {
    response: TicketResponseEntry;
    onPreviewAttachment: (attachment: TicketAttachmentItem, list?: TicketAttachmentItem[]) => void;
    resendUrl?: string;
    reporterEmail?: string;
}

export function TicketResponseItem({ response, onPreviewAttachment, resendUrl, reporterEmail }: TicketResponseItemProps) {
    const dateSource = response.sent_at || response.created_at;
    const isSystem = response.is_system === true;
    const isReporter = response.is_reporter === true;
    const showEmailWarning = response.email_status === 'failed' || response.email_status === 'bounced';

    return (
        <div className={cn('mb-4 flex w-full', isReporter ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'flex max-w-[85%] flex-col gap-1.5 sm:max-w-[70%]',
                    isReporter ? 'items-end' : 'items-start',
                    showEmailWarning && 'w-full sm:w-[28rem]',
                )}
            >
                {/* Bagian Atas: Nama & Badge (DI LUAR BUBBLE) */}
                <div className={cn('flex items-center gap-2 px-1', isReporter ? 'justify-end' : 'justify-start')}>
                    <span className={cn('text-foreground text-sm font-medium', isSystem && 'text-muted-foreground')}>
                        {isSystem && <TimerOff className="mr-1 inline size-3.5" />}
                        {response.user_name}
                    </span>
                    {!isReporter && (
                        <Badge variant={responseTypeVariant(response.type)} className="h-4 px-1.5 py-0 text-[10px]">
                            {isSystem ? 'Otomatis' : responseTypeLabel(response.type)}
                        </Badge>
                    )}
                </div>

                {/* Bagian Tengah: Bubble Pesan */}
                <div
                    className={cn(
                        'w-fit max-w-full rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap',
                        isSystem
                            ? 'bg-muted text-muted-foreground border border-dashed italic'
                            : isReporter
                              ? 'bg-secondary text-secondary-foreground rounded-tr-sm' // Tail untuk pelapor (kanan atas)
                              : 'bg-primary text-primary-foreground rounded-tl-sm shadow-sm', // Tail untuk petugas (kiri atas)
                    )}
                >
                    {response.message}
                </div>

                {/* Bagian Bawah: Lampiran (Jika Ada) */}
                {response.attachments && response.attachments.length > 0 && (
                    <div className={cn('mt-1 flex flex-wrap gap-2', isReporter ? 'justify-end' : 'justify-start')}>
                        {response.attachments.map((att) => (
                            <div key={att.id} className="bg-background flex items-center rounded-md border shadow-sm">
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
                                    <span className="text-foreground max-w-[150px] truncate">{att.original_name}</span>
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
                )}

                {/* Bagian Paling Bawah: Tanggal & Status (DI LUAR BUBBLE) */}
                {dateSource && (
                    <div
                        className={cn(
                            'text-muted-foreground flex items-center gap-1.5 px-1 text-[11px]',
                            isReporter ? 'justify-end' : 'justify-start',
                        )}
                    >
                        <span>{formatFullDate(dateSource)}</span>
                        {response.email_status && !isReporter && (
                            <>
                                <span className="hidden sm:inline">•</span>
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

                {/* Peringatan Email Gagal */}
                {showEmailWarning && (
                    <div className="mt-1 w-full space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                            <span>
                                Pelapor kemungkinan tidak menerima balasan ini. Hubungi pelapor lewat kanal lain (telepon/WhatsApp), atau perbarui
                                email pelapor dan kirim ulang.
                            </span>
                        </div>
                        {resendUrl && <ResendForm url={resendUrl} currentEmail={reporterEmail ?? ''} />}
                    </div>
                )}
            </div>
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
                    className="bg-background h-8 text-xs"
                />
                {errors.reporter_email && <p className="text-destructive mt-1 text-[10px]">{errors.reporter_email}</p>}
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={processing} className="bg-background h-8 gap-1.5 text-xs">
                <RefreshCw className={cn('size-3', processing && 'animate-spin')} />
                Kirim ulang email
            </Button>
        </form>
    );
}
