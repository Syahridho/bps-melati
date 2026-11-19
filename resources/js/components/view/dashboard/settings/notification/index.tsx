import { PushNotificationCard } from '@/components/organisms/settings/push-notification-card';
import RealTimeDashboard from '@/components/organisms/settings/real-time-dashboard';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { BreadcrumbItem } from '@/types';
import { type NotificationSettingsPageProps } from '@/types/settings';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Notifikasi', href: '/settings/notification' }];

export default function NotificationSettingsView() {
    const { dashboardLiveEnabled, canManageGlobal } = usePage<NotificationSettingsPageProps>().props;
    const [processing, setProcessing] = useState(false);

    const handleLiveToggle = (checked: boolean) => {
        router.patch(
            route('settings.notification.dashboard-live'),
            { dashboard_live_enabled: checked },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => toast.success('Pengaturan realtime dashboard diperbarui.'),
                onError: (errors) =>
                    toast.error('Gagal memperbarui pengaturan realtime dashboard.', {
                        description: Object.values(errors)[0],
                    }),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pengaturan Notifikasi" />
            <SettingsLayout title="Pengaturan Notifikasi" description="Kelola notifikasi push browser dan pembaruan realtime dashboard">
                <PushNotificationCard />

                {canManageGlobal && <RealTimeDashboard enabled={dashboardLiveEnabled} processing={processing} onToggle={handleLiveToggle} />}
            </SettingsLayout>
        </AppLayout>
    );
}
