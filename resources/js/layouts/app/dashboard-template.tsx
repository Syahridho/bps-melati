import { ChartAreaLinear } from '@/components/chart-area-linear';
import { ChartPieDonutText } from '@/components/chart-pie-donut-text';
import { ChartPieLabel } from '@/components/chart-pie-label';
import { DashboardChannelCards } from '@/components/dashboard-channel-cards';
import { DashboardRecentTickets } from '@/components/dashboard-recent-tickets';
import { DashboardStatCards } from '@/components/dashboard-stat-cards';
import { DashboardStatusCards } from '@/components/dashboard-status-cards';
import AppLayout from '@/layouts/app-layout';
import { type DashboardTemplateProps } from '@/types/dashboard';
import { Head } from '@inertiajs/react';

export default function DashboardTemplate({
    title,
    headerTitle,
    breadcrumbs,
    stats,
    trend,
    recentTickets,
    periodLabel,
    channelCards,
    allTicketsRoute,
    ticketDetailRouteName,
}: DashboardTemplateProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />
            <div className="space-y-6 px-4 py-6">
                {/* Header periode */}
                <div className="flex flex-col gap-1">
                    <h2 className="text-sm leading-snug font-semibold break-words sm:text-base">{headerTitle}</h2>
                    <p className="text-muted-foreground text-xs">Menampilkan data: {periodLabel}</p>
                </div>

                <div className="min-w-0 space-y-6">
                    <DashboardStatCards stats={stats} />

                    <DashboardChannelCards stats={stats} channelCards={channelCards} />

                    {/* Pie charts */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <ChartPieDonutText stats={stats} />
                        <ChartPieLabel stats={stats} />
                    </div>

                    <DashboardStatusCards stats={stats} />

                    {/* Tren */}
                    <ChartAreaLinear data={trend} periodLabel={periodLabel} />

                    {/* Laporan terbaru */}
                    <DashboardRecentTickets
                        recentTickets={recentTickets}
                        periodLabel={periodLabel}
                        allTicketsRoute={allTicketsRoute}
                        ticketDetailRouteName={ticketDetailRouteName}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
