import DashboardView from '@/components/view/dashboard/index';
import { useDashboardRealtime } from '@/hooks/use-dashboard-realtime';
import { DASHBOARD_CHANNEL_CARDS } from '@/lib/dashboard-constants';
import { type DashboardProps } from '@/types/dashboard';

export default function DashboardAdminPage(props: DashboardProps) {
    const isLiveEnabled = props.isLiveEnabled ?? true;
    const { isLive } = useDashboardRealtime(isLiveEnabled);

    return (
        <>
            <DashboardView
                {...props}
                isLive={isLive}
                isLiveEnabled={isLiveEnabled}
                title="Dashboard Admin"
                headerTitle="PENANGANAN KONSULTASI PENGADUAN BPS PROVINSI RIAU"
                breadcrumbs={[{ title: 'Dashboard Admin', href: route('dashboard.admin.index') }]}
                channelCards={DASHBOARD_CHANNEL_CARDS}
                allTicketsRoute={route('dashboard.admin.laporan-masuk.index')}
                ticketDetailRouteName="dashboard.admin.laporan-masuk.show"
            />
        </>
    );
}
