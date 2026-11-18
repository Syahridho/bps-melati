import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { LoaderCircle } from 'lucide-react';

interface PushNotificationCardProps {
    /** Tampilan push tidak didukung browser (mis. iOS non-PWA). */
    isUnsupported?: boolean;
}

function getHelperText(status: string, isUnsupported: boolean) {
    if (isUnsupported) return 'Browser ini belum mendukung notifikasi push.';
    if (status === 'denied') return 'Notifikasi diblokir di browser. Ubah lewat pengaturan situs.';
    if (status === 'default') return 'Nyalakan switch untuk menerima notifikasi saat Melati ditutup.';
    return undefined;
}

export function PushNotificationCard({ isUnsupported = false }: PushNotificationCardProps) {
    const { status, isSubscribed, isLoading, toggle } = usePushNotifications();

    const checked = status === 'granted' && isSubscribed;
    const helperText = getHelperText(status, isUnsupported);

    return (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="space-y-0.5">
                <Label htmlFor="push-notification-switch" className="text-sm font-medium">
                    Notifikasi Push Browser
                </Label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Terima notifikasi sistem di perangkat ini saat Melati ditutup. Pengaturan ini hanya berlaku untuk browser/perangkat yang sedang
                    dipakai.
                </p>
                {helperText && <p className="text-muted-foreground text-xs">{helperText}</p>}
            </div>

            <div className="flex items-center gap-2">
                {isLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                <Switch
                    id="push-notification-switch"
                    checked={checked}
                    onCheckedChange={toggle}
                    disabled={isLoading || isUnsupported || status === 'unsupported' || status === 'denied'}
                />
            </div>
        </div>
    );
}
