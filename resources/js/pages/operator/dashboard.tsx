import { DASHBOARD_CHANNEL_CARDS } from '@/lib/dashboard-constants';
import DashboardTemplate from '@/pages/dashboard-template';
import { type DashboardProps } from '@/types/dashboard';

export default function OperatorDashboard(props: DashboardProps) {
    return (
        <DashboardTemplate
            {...props}
            title="Dashboard Operator"
            headerTitle="PENANGANAN KONSULTASI PENGADUAN BPS PROVINSI RIAU"
            breadcrumbs={[{ title: 'Dashboard Operator', href: route('dashboard.operator.index') }]}
            channelCards={DASHBOARD_CHANNEL_CARDS}
            allTicketsRoute={route('dashboard.operator.laporan-masuk.index')}
            ticketDetailRouteName="dashboard.operator.laporan-masuk.show"
        />
    );
}
