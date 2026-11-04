import DashboardView from '@/components/view/dashboard/index';
import { DASHBOARD_CHANNEL_CARDS } from '@/lib/dashboard-constants';
import { type DashboardProps } from '@/types/dashboard';

export default function DashboardOperatorTimPage(props: DashboardProps) {
    return (
        <>
            <DashboardView
                {...props}
                title="Dashboard Operator Tim"
                headerTitle="PENANGANAN KONSULTASI PENGADUAN BPS PROVINSI RIAU"
                breadcrumbs={[{ title: 'Dashboard Operator Tim', href: route('dashboard.operator.index') }]}
                channelCards={DASHBOARD_CHANNEL_CARDS}
                allTicketsRoute={route('dashboard.operator.input-data.index')}
                ticketDetailRouteName="dashboard.operator.input-data.show"
            />
        </>
    );
}
