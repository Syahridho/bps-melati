import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AlertBannerProps {
    variant: 'success' | 'error';
    message: string;
}

const STYLES = {
    success: {
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        Icon: CheckCircle2,
    },
    error: {
        className: 'border-destructive/30 bg-destructive/10 text-destructive',
        Icon: AlertCircle,
    },
};

export function AlertBanner({ variant, message }: AlertBannerProps) {
    const { className, Icon } = STYLES[variant];

    return (
        <div role={variant === 'error' ? 'alert' : 'status'} className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${className}`}>
            <Icon className="h-5 w-5 shrink-0" />
            <span>{message}</span>
        </div>
    );
}
