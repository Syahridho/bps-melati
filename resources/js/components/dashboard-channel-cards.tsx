import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type DashboardChannelCardConfig, type DashboardStats } from '@/types/dashboard';

interface DashboardChannelCardsProps {
    stats: DashboardStats;
    channelCards: DashboardChannelCardConfig[];
    variant: 'admin' | 'operator';
}

export function DashboardChannelCards({ stats, channelCards, variant }: DashboardChannelCardsProps) {
    if (variant === 'admin') {
        return (
            <div>
                <p className="mb-2 text-xs font-semibold">Sumber kanal</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
                    {channelCards.map(({ key, label, card, text }) => {
                        const value = stats[key] ?? 0;

                        return (
                            <Card key={key} className={cn('min-w-0 border shadow-xs transition-shadow hover:shadow-sm', card)}>
                                <CardHeader className="pb-2">
                                    <CardTitle className={cn('text-xs leading-tight font-medium', text)}>{label}</CardTitle>
                                </CardHeader>
                                <CardContent className="!pb-2">
                                    <div className={cn('text-3xl font-bold', text)}>{value}</div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {channelCards.map(({ key, label, desc, icon: Icon, card, iconWrap, text }) => {
                const value = stats[key] ?? 0;
                return (
                    <Card key={key} className={cn('border shadow-xs transition-shadow hover:shadow-sm', card)}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className={cn('text-sm font-medium', text)}>{label}</CardTitle>
                            {Icon && (
                                <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', iconWrap)}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className={cn('text-3xl font-bold', text)}>{value}</div>
                            {desc && <p className="text-muted-foreground mt-1 text-xs">{desc}</p>}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
