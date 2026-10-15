import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type TicketResponseItem } from '@/types/laporan-masuk';
import { AlertCircle, Check, Loader2, MailX, MinusCircle } from 'lucide-react';

interface EmailStatusBadgeProps {
    status: TicketResponseItem['email_status'];
    sentAt?: string | null;
    failedAt?: string | null;
    error?: string | null;
}

export function EmailStatusBadge({ status, sentAt, failedAt, error }: EmailStatusBadgeProps) {
    if (!status) {
        return null;
    }

    const config: Record<
        string,
        {
            label: string;
            icon: typeof Check;
            className: string;
            animate?: boolean;
        }
    > = {
        pending: {
            label: 'Mengirim email…',
            icon: Loader2,
            className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
            animate: true,
        },
        sent: {
            label: 'Email terkirim',
            icon: Check,
            className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
        },
        failed: {
            label: 'Email gagal terkirim',
            icon: AlertCircle,
            className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
        },
        bounced: {
            label: 'Email tidak sampai',
            icon: MailX,
            className: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400',
        },
        skipped: {
            label: 'Email tidak dikirim',
            icon: MinusCircle,
            className: 'text-muted-foreground border-transparent bg-muted/50',
        },
    };

    const c = config[status];
    if (!c) {
        return null;
    }

    const Icon = c.icon;

    let tooltipText = c.label;
    if (status === 'sent' && sentAt) {
        const timeFormatted = new Date(sentAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        tooltipText = `Diserahkan ke server email pada ${timeFormatted}`;
    } else if ((status === 'failed' || status === 'bounced') && failedAt) {
        const timeFormatted = new Date(failedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        tooltipText = `Gagal pada ${timeFormatted}${error ? `: ${error}` : ''}`;
    } else if (status === 'skipped') {
        tooltipText = 'Email tidak dikirim karena pelapor tidak mengisi alamat email.';
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        aria-live="polite"
                        className={cn(
                            'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-all duration-200',
                            c.className,
                        )}
                    >
                        <Icon className={cn('size-3', c.animate && 'animate-spin')} />
                        {c.label}
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                    <p>{tooltipText}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
