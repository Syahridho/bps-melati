import { cn } from '@/lib/utils';
import { type ConnectionStatus } from '@laravel/echo-react';

interface ConnectionIndicatorProps {
    isLive?: boolean;
    connectionStatus?: ConnectionStatus;
    className?: string;
    isLiveEnabled?: boolean;
}

export function ConnectionIndicator({ isLive = true, connectionStatus, isLiveEnabled = true, className }: ConnectionIndicatorProps) {
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

    const isReconnecting = connectionStatus === 'connecting' || connectionStatus === 'reconnecting';
    const isConnected = connectionStatus ? connectionStatus === 'connected' : isLive;

    const label = isConnected ? 'Live' : isReconnecting ? 'Menyambung ulang...' : 'Offline';
    const title = isConnected
        ? 'Terhubung real-time'
        : isReconnecting
          ? 'Sedang menyambung ulang ke server real-time...'
          : 'Offline / Terputus';

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors',
                isConnected
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : isReconnecting
                      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400',
                className,
            )}
            title={title}
        >
            <span
                className={cn(
                    'h-1.5 w-1.5 rounded-full animate-pulse',
                    isConnected ? 'bg-emerald-500' : isReconnecting ? 'bg-amber-500' : 'bg-neutral-400',
                )}
            />
            <span>{label}</span>
        </div>
    );
}
