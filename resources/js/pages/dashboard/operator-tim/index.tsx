import DashboardView from '@/components/view/dashboard/index';
import { DASHBOARD_CHANNEL_CARDS } from '@/lib/dashboard-constants';
import { type DashboardProps } from '@/types/dashboard';

export default function DashboardAdminPage(props: DashboardProps) {
    return (
        <>
            <DashboardView
                {...props}
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
