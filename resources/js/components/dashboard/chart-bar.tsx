'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { DASHBOARD_CHANNEL_CARDS } from '@/lib/dashboard-constants';
import { type ChannelKey, type DashboardStats } from '@/types/dashboard';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';

const CHANNEL_COLORS: Record<ChannelKey, string> = {
    span_lapor: '#8b5cf6', // violet-500
    sosial_media: '#ec4899', // pink-500
    kunjungan_langsung: '#84cc16', // lime-500
    wbs: '#f97316', // orange-500
    email: '#14b8a6', // teal-500
    website: '#0ea5e9', // sky-500
};

// Label dan warna tiap kanal, dipakai tooltip lewat nameKey="key"
const chartConfig = {
    total: { label: 'Jumlah Laporan' },
    ...Object.fromEntries(DASHBOARD_CHANNEL_CARDS.map((card) => [card.key, { label: card.label, color: CHANNEL_COLORS[card.key] }])),
} satisfies ChartConfig;

export function ChartBarDefault({ stats }: { stats: DashboardStats }) {
    const chartData = DASHBOARD_CHANNEL_CARDS.map((card) => ({
        key: card.key,
        channel: card.label,
        total: stats[card.key] ?? 0,
        fill: CHANNEL_COLORS[card.key],
    }));

    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <CardTitle>Sumber Kanal</CardTitle>
                <CardDescription>Sumber laporan yang masuk</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
                    <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ top: 0, left: 0, right: 32, bottom: 0 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis dataKey="channel" type="category" tickLine={false} axisLine={false} tickMargin={8} width={130} />
                        <XAxis dataKey="total" type="number" hide />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
                        <Bar dataKey="total" radius={6} maxBarSize={32}>
                            <LabelList dataKey="total" position="right" offset={8} className="fill-foreground" fontSize={12} />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
