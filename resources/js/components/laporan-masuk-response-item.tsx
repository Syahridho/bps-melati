import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatFullDate, responseTypeLabel, responseTypeVariant } from '@/lib/laporan-masuk-utils';
import { cn } from '@/lib/utils';
import { type Attachment, type TicketResponseItem } from '@/types/laporan-masuk';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Mail, MailX, Paperclip, RefreshCw, TimerOff } from 'lucide-react';

function EmailStatusBadge({ status }: { status: TicketResponseItem['email_status'] }) {
    if (!status) return null;

    const config: Record<string, { label: string; icon: typeof Mail; className: string }> = {
        sent: {
            label: 'Diserahkan ke server email',
            icon: CheckCircle2,
            className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        },
        failed: {
            label: 'Gagal dikirim',
            icon: MailX,
            className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
        },
        bounced: {
            label: 'Email tidak terkirim (bounce)',
            icon: AlertTriangle,
            className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        },
        pending: {
            label: 'Menunggu pengiriman',
            icon: Mail,
            className: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
        },
        skipped: {
            label: 'Email tidak dikirim (tanpa alamat)',
            icon: Mail,
            className: 'text-muted-foreground border-transparent bg-transparent',
        },
    };

    const c = config[status];
    if (!c) return null;

    const Icon = c.icon;
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium', c.className)}>
            <Icon className="size-3" />
            {c.label}
        </span>
    );
}

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

            {/* Email status badge */}
            {response.email_status && !response.is_reporter && (
                <div className="pt-1">
                    <EmailStatusBadge status={response.email_status} />
                </div>
            )}

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
                Kirim ulang
            </Button>
        </form>
    );
}

export { LaporanMasukResponseItem as ResponseItem };
