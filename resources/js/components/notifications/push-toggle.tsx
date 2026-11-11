'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { cn } from '@/lib/utils';

interface PushToggleProps {
    /** Tampilan push tidak didukung browser (mis. iOS non-PWA). */
    isUnsupported?: boolean;
}

export function PushToggle({ isUnsupported = false }: PushToggleProps) {
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
        <div className="flex items-start gap-3 px-4 py-3 border-t bg-background">
            <div className="flex h-6 items-center justify-center shrink-0">
                <BellOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
                <Label htmlFor="push-toggle-switch" className="text-sm font-medium text-foreground">
                    Notifikasi push
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Terima notifikasi saat Melati ditutup.
                </p>
                {helperText && (
                    <p className="text-xs text-muted-foreground">{helperText}</p>
                )}
            </div>
            <Switch
                id="push-toggle-switch"
                checked={checked}
                onCheckedChange={handleToggle}
                disabled={isLoading || status === 'unsupported' || status === 'denied'}
                aria-label={
                    status === 'denied'
                        ? 'Notifikasi push, diblokir browser'
                        : status === 'unsupported'
                          ? 'Notifikasi push, tidak didukung browser'
                          : `Notifikasi push, ${checked ? 'diaktifkan' : 'dinonaktifkan'}`
                }
                className={cn(
                    'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
                    isLoading && 'opacity-50',
                )}
            />
        </div>
    );
}
