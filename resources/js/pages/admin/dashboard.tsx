import { DASHBOARD_CHANNEL_CARDS } from '@/lib/dashboard-constants';
import DashboardTemplate from '@/pages/dashboard-template';
import { type DashboardProps } from '@/types/dashboard';

export default function AdminDashboard(props: DashboardProps) {
    return (
        <DashboardTemplate
            {...props}
            title="Dashboard Admin"
            headerTitle="PENANGANAN KONSULTASI PENGADUAN BPS PROVINSI RIAU"
            breadcrumbs={[{ title: 'Dashboard Admin', href: route('dashboard.admin.index') }]}
            channelCards={DASHBOARD_CHANNEL_CARDS}
            allTicketsRoute={route('dashboard.admin.laporan-masuk.index')}
            ticketDetailRouteName="dashboard.admin.laporan-masuk.show"
        />
    );
}
