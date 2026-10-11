import { OPERATOR_CHANNEL_CARDS } from '@/lib/dashboard-constants';
import DashboardTemplate from '@/pages/dashboard-template';
import { type DashboardProps } from '@/types/dashboard';

export default function OperatorDashboard(props: DashboardProps) {
    return (
        <DashboardTemplate
            {...props}
            title="Dashboard Operator"
            headerTitle="Ringkasan Laporan"
            breadcrumbs={[{ title: 'Dashboard Operator', href: route('dashboard.operator.index') }]}
            channelCards={OPERATOR_CHANNEL_CARDS}
            variant="operator"
            allTicketsRoute={route('dashboard.operator.laporan-masuk.index')}
            ticketDetailRouteName="dashboard.operator.laporan-masuk.show"
        />
    );
}
