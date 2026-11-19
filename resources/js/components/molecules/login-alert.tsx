import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Clock, Info, TriangleAlert } from 'lucide-react';

export type LoginAlertTone = 'error' | 'warning' | 'info';

interface LoginAlertProps {
    tone?: LoginAlertTone;
    title?: string;
    message: string;
    /** Dipakai aria-describedby agar pembaca layar membacakan pesan ini. */
    id?: string;
    className?: string;
}

const TONE_STYLES: Record<LoginAlertTone, string> = {
    error: 'border-destructive/40 bg-destructive/10 text-destructive dark:text-destructive-foreground',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    info: 'border-primary/40 bg-primary/10 text-primary dark:text-primary-foreground',
};

const TONE_ICONS: Record<LoginAlertTone, typeof AlertCircle> = {
    error: AlertCircle,
    warning: TriangleAlert,
    info: Info,
};

/**
 * Alert umum di atas form login: throttle, akun nonaktif, sesi habis, error
 * server. Render sebagai region `alert` agar dibacakan pembaca layar.
 */
export function LoginAlert({ tone = 'error', title, message, id, className }: LoginAlertProps) {
    const Icon = tone === 'info' ? Clock : TONE_ICONS[tone];

    return (
        <Alert id={id} role="alert" aria-live="polite" variant="destructive" className={`${TONE_STYLES[tone]} ${className ?? ''}`}>
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
                {title && <AlertTitle className="text-sm font-semibold">{title}</AlertTitle>}
                <AlertDescription className="text-sm leading-relaxed">{message}</AlertDescription>
            </div>
        </Alert>
    );
}
