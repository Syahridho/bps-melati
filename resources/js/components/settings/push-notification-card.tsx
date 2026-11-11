'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { cn } from '@/lib/utils';

interface PushNotificationCardProps {
    /** Tampilan push tidak didukung browser (mis. iOS non-PWA). */
    isUnsupported?: boolean;
}

export function PushNotificationCard({ isUnsupported = false }: PushNotificationCardProps) {
    const { status, isSubscribed, isLoading, toggle } = usePushNotifications();
    const [checked, setChecked] = useState(false);

    // Sinkronkan state switch dengan status hook.
    useEffect(() => {
        setChecked(status === 'granted' && isSubscribed);
    }, [status, isSubscribed]);

    const handleToggle = useCallback(
        async (next: boolean) => {
            setChecked(next);
            await toggle(next);
        },
        [toggle],
    );

    const helperText = useMemo(() => {
        if (isUnsupported) {
            return 'Browser ini belum mendukung notifikasi push.';
        }
        if (status === 'denied') {
            return 'Notifikasi diblokir di browser. Ubah lewat pengaturan situs.';
        }
        if (status === 'default') {
            return 'Nyalakan switch untuk menerima notifikasi saat Melati ditutup.';
        }
        return undefined;
    }, [isUnsupported, status]);

    return (
        <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                    <Label htmlFor="push-notification-switch" className="text-sm font-medium">
                        Notifikasi Push Browser
                    </Label>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Terima notifikasi sistem di perangkat ini saat Melati ditutup. Pengaturan ini
                        hanya berlaku untuk browser/perangkat yang sedang dipakai.
                    </p>
                    {helperText && (
                        <p className="text-xs text-muted-foreground">{helperText}</p>
                    )}
                </div>
                <Switch
                    id="push-notification-switch"
                    checked={checked}
                    onCheckedChange={handleToggle}
                    disabled={isLoading || status === 'unsupported' || status === 'denied'}
                    aria-label={
                        status === 'denied'
                            ? 'Notifikasi push browser, diblokir browser'
                            : status === 'unsupported'
                              ? 'Notifikasi push browser, tidak didukung browser'
                              : `Notifikasi push browser, ${checked ? 'diaktifkan' : 'dinonaktifkan'}`
                    }
                    className={cn(
                        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
                        isLoading && 'opacity-50',
                    )}
                />
            </div>
        </div>
    );
}
