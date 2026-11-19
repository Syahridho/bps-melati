import { cn } from '@/lib/utils';

interface ConnectionIndicatorProps {
    isLive?: boolean;
    className?: string;
    isLiveEnabled?: boolean;
}

export function ConnectionIndicator({ isLive = true, isLiveEnabled = true, className }: ConnectionIndicatorProps) {
    if (!isLiveEnabled) {
        return (
            <div
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors',
                    'border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400',
                    className,
                )}
                title="Pembaruan real-time dinonaktifkan di Pengaturan. Refresh halaman untuk memperbarui data."
            >
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                <span>Live Mati</span>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors',
                isLive
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400',
                className,
            )}
            title={isLive ? 'Terhubung real-time' : 'Offline / Terputus'}
        >
            <span
                className={cn(
                    'h-1.5 w-1.5 rounded-full animate-pulse',
                    isLive ? 'bg-emerald-500' : 'bg-neutral-400',
                )}
            />
            <span>{isLive ? 'Live' : 'Offline'}</span>
        </div>
    );
}
