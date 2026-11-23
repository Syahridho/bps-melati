import { ConnectionIndicator } from '@/components/atoms/connection-indicator';
import { DashboardPeriodFilter } from '@/components/molecules/dashboard-period-filter';
import { router } from '@inertiajs/react';
import { ChartAreaLinear } from '@/components/organisms/dashboard/chart-area-linear';
import { ChartBarDefault } from '@/components/organisms/dashboard/chart-bar';
import { ChartPieLabel } from '@/components/organisms/dashboard/chart-pie-label';
import { DashboardRecentTickets } from '@/components/organisms/dashboard/dashboard-recent-tickets';
import { DashboardStatCards } from '@/components/organisms/dashboard/dashboard-stat-cards';
import { DashboardStatusCards } from '@/components/organisms/dashboard/dashboard-status-cards';
import { useAuthRole } from '@/hooks/use-auth-role';
import AppLayout from '@/layouts/app-layout';
import { ExtendedDashboardTemplateProps } from '@/types/dashboard';
import { Head } from '@inertiajs/react';

export default function DashboardView({
    title,
    headerTitle,
    breadcrumbs,
    stats,
    trend,
    recentTickets,
    periodLabel,
    sumberKanal,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    channelCards,
    allTicketsRoute,
    ticketDetailRouteName,
    isLive = true,
    isLiveEnabled = true,
    period = 'this_month',
    canFilterPeriod = false,
    month,
    year,
    years = [],
    months = [],
}: ExtendedDashboardTemplateProps) {
    const { isOperatorTim } = useAuthRole();

    const handlePeriodChange = (next: { period: string; month?: string | number; year?: string | number }) => {
        const params: Record<string, string> = { period: next.period };
        if (next.period === 'custom') {
            if (next.month !== undefined && next.month !== null && next.month !== '') {
                params.month = String(next.month);
            }
            if (next.year !== undefined && next.year !== null && next.year !== '') {
                params.year = String(next.year);
            }
        }
        router.get(window.location.pathname, params, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />
            <div className="space-y-6 px-4 py-6">
                {/* Header periode & Realtime Status */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-sm leading-snug font-semibold break-words sm:text-base">{headerTitle}</h2>
                        <p className="text-muted-foreground text-xs">{periodLabel}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {canFilterPeriod && (
                            <DashboardPeriodFilter
                                period={period}
                                month={month ?? 1}
                                year={year ?? new Date().getFullYear()}
                                years={years ?? []}
                                months={months ?? []}
                                onChange={handlePeriodChange}
                            />
                        )}
                        {period === 'this_month' ? (
                            <ConnectionIndicator isLive={isLive} isLiveEnabled={isLiveEnabled} />
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                                Data Historis
                            </span>
                        )}
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
                            <ChartBarDefault sumberKanal={sumberKanal} />
                        </div>
                    </div>

                    {/* Tren */}
                    <ChartAreaLinear data={trend} periodLabel={periodLabel} />
                    <div>
                        <div className="flex flex-col gap-1">
                            <p className="mb-2 text-xs font-semibold">Status Laporan</p>
                        </div>
                        <DashboardStatusCards stats={stats} />
                    </div>
                    {/* Laporan terbaru */}
                    {!isOperatorTim && (
                        <DashboardRecentTickets
                            recentTickets={recentTickets}
                            periodLabel={periodLabel}
                            allTicketsRoute={allTicketsRoute}
                            ticketDetailRouteName={ticketDetailRouteName}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
