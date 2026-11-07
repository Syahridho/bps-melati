import { ConnectionIndicator } from '@/components/header/ConnectionIndicator';
import { ChartAreaLinear } from '@/components/dashboard/chart-area-linear';
import { ChartBarDefault } from '@/components/dashboard/chart-bar';
import { ChartPieLabel } from '@/components/dashboard/chart-pie-label';
import { DashboardRecentTickets } from '@/components/dashboard/dashboard-recent-tickets';
import { DashboardStatCards } from '@/components/dashboard/dashboard-stat-cards';
import { DashboardStatusCards } from '@/components/dashboard/dashboard-status-cards';
import AppLayout from '@/layouts/app-layout';
import { type DashboardTemplateProps } from '@/types/dashboard';
import { Head } from '@inertiajs/react';

interface ExtendedDashboardTemplateProps extends DashboardTemplateProps {
    isLive?: boolean;
    isLiveEnabled?: boolean;
}

export default function DashboardView({
    title,
    headerTitle,
    breadcrumbs,
    stats,
    trend,
    recentTickets,
    periodLabel,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    channelCards,
    allTicketsRoute,
    ticketDetailRouteName,
    isLive = true,
    isLiveEnabled = true,
}: ExtendedDashboardTemplateProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />
            <div className="space-y-6 px-4 py-6">
                {/* Header periode & Realtime Status */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-sm leading-snug font-semibold break-words sm:text-base">{headerTitle}</h2>
                        <p className="text-muted-foreground text-xs">Menampilkan data: {periodLabel}</p>
                    </div>
                    <div className="shrink-0">
                        <ConnectionIndicator isLive={isLive} isLiveEnabled={isLiveEnabled} />
                    </div>
                </div>

                <div className="min-w-0 space-y-6">
                    <DashboardStatCards stats={stats} />

                    {/* <DashboardChannelCards stats={stats} channelCards={channelCards} /> */}

                    {/* Pie charts */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        {/* <ChartPieDonutText stats={stats} /> */}

                        <div className="min-w-0 lg:col-span-4">
                            <ChartPieLabel stats={stats} />
                        </div>
                        <div className="min-w-0 lg:col-span-8">
                            <ChartBarDefault stats={stats} />
                        </div>
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
