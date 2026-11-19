'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { type SumberKanalItem } from '@/types/dashboard';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';

export function ChartBarDefault({ sumberKanal }: { sumberKanal: SumberKanalItem[] }) {
    const chartData = sumberKanal.map((item) => ({
        key: `channel-${item.id}`,
        channel: item.name,
        total: item.total,
        fill: item.color,
    }));

    const chartConfig = {
        total: { label: 'Jumlah Laporan' },
        ...Object.fromEntries(sumberKanal.map((item) => [`channel-${item.id}`, { label: item.name, color: item.color }])),
    } satisfies ChartConfig;

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
