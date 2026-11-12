'use client';

import { useCallback, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { PushNotificationCard } from '@/components/settings/push-notification-card';
import { cn } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Head, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { type NotificationSettingsPageProps } from '@/types/pengaturan';

export default function NotificationSettingsView() {
    const { dashboardLiveEnabled, canManageGlobal } = usePage<NotificationSettingsPageProps>().props;

    const [liveEnabled, setLiveEnabled] = useState(dashboardLiveEnabled);
    const [liveLoading, setLiveLoading] = useState(false);

    const handleLiveToggle = useCallback(
        async (checked: boolean) => {
            if (checked === liveEnabled || liveLoading) return;

            setLiveLoading(true);
            const previous = liveEnabled;
            setLiveEnabled(checked);

            try {
                const res = await fetch(route('settings.notification.dashboard-live'), {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN':
                            document.querySelector<HTMLMetaElement>(
                                'meta[name="csrf-token"]',
                            )?.content ?? '',
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ dashboard_live_enabled: checked }),
                });

                if (!res.ok) {
                    throw new Error('Gagal menyimpan pengaturan realtime dashboard.');
                }

                toast.success('Pengaturan realtime dashboard diperbarui.');
            } catch (err) {
                setLiveEnabled(previous);
                const message =
                    err instanceof Error ? err.message : 'Terjadi kesalahan.';
                toast('Gagal memperbarui pengaturan realtime dashboard.', {
                    description: message,
                });
            } finally {
                setLiveLoading(false);
            }
        },
        [liveEnabled, liveLoading],
    );

    return (
        <AppLayout>
            <Head title="Pengaturan Notifikasi" />
            <SettingsLayout
                title="Pengaturan Notifikasi"
                description="Kelola notifikasi push browser dan pembaruan realtime dashboard"
            >
                <PushNotificationCard />

                {canManageGlobal && (
                    <>
                        <Separator />
                        <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <Label
                                        htmlFor="dashboard_live_enabled"
                                        className="text-sm font-medium"
                                    >
                                        Pembaruan Realtime Dashboard
                                    </Label>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        Aktifkan pembaruan data real-time via WebSocket di
                                        dashboard admin & operator. Bila dimatikan, halaman harus
                                        di-refresh manual untuk melihat data terbaru guna menghemat
                                        beban server.
                                    </p>
                                </div>
                                <Switch
                                    id="dashboard_live_enabled"
                                    checked={liveEnabled}
                                    onCheckedChange={handleLiveToggle}
                                    disabled={liveLoading || !canManageGlobal}
                                    aria-label={
                                        canManageGlobal
                                            ? `Pembaruan realtime dashboard, ${liveEnabled ? 'diaktifkan' : 'dinonaktifkan'}`
                                            : 'Pembaruan realtime dashboard, hanya admin'
                                    }
                                    className={cn(
                                        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
                                        liveLoading && 'opacity-50',
                                    )}
                                />
                                {liveLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            </div>
                        </div>
                    </>
                )}
            </SettingsLayout>
        </AppLayout>
    );
}
