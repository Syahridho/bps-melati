'use client';

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    type ChartConfig,
} from '@/components/ui/chart';
import { CLASSIFICATION_SERIES } from '@/lib/classification-series';

export type TrendPoint = {
    label: string;
    pengaduan: number;
    aspirasi: number;
    permintaan_informasi: number;
    total: number;
};

const chartConfig = {
    total: { label: 'Tiket' },
    ...Object.fromEntries(CLASSIFICATION_SERIES.map((s) => [s.key, { label: s.label, color: s.color }])),
} satisfies ChartConfig;

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload?: TrendPoint }>; label?: string }) {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload as TrendPoint | undefined;
    if (!row) return null;
    const dayTotal = row.pengaduan + row.aspirasi + row.permintaan_informasi;
    const sorted = [...CLASSIFICATION_SERIES].sort((a, b) => (row[b.key] ?? 0) - (row[a.key] ?? 0));
    return (
        <div className="grid min-w-[11rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
            <div className="font-medium">{label}</div>
            <div className="grid gap-1.5">
                {sorted.map((s) => (
                    <div key={s.key} className="flex w-full items-center justify-between gap-4">
                        <span className="flex items-center gap-2 text-muted-foreground">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: s.color }} />
                            {s.label}
                        </span>
                        <span className="font-mono font-medium tabular-nums">{row[s.key] ?? 0}</span>
                    </div>
                ))}
                <div className="flex w-full items-center justify-between gap-4 border-t pt-1.5 font-medium">
                    <span>Total</span>
                    <span className="font-mono tabular-nums">{dayTotal}</span>
                </div>
            </div>
        </div>
    );
}

export function ChartAreaLinear({ data, periodLabel }: { data: TrendPoint[]; periodLabel: string }) {
    const sum = data.reduce((acc, item) => acc + item.total, 0);
    const peak = data.reduce(
        (max, item) => (item.total > max.total ? item : max),
        data[0] ?? ({ label: '-', total: 0, pengaduan: 0, aspirasi: 0, permintaan_informasi: 0 } as TrendPoint)
    );
    const totals: Record<(typeof CLASSIFICATION_SERIES)[number]['key'], number> = {
        pengaduan: data.reduce((acc, item) => acc + item.pengaduan, 0),
        aspirasi: data.reduce((acc, item) => acc + item.aspirasi, 0),
        permintaan_informasi: data.reduce((acc, item) => acc + item.permintaan_informasi, 0),
    };
    const sortedSeries = useMemo(() => {
        const order = new Map(CLASSIFICATION_SERIES.map((s, i) => [s.key, i]));
        return [...CLASSIFICATION_SERIES].sort((a, b) => {
            const diff = totals[b.key] - totals[a.key];
            return diff !== 0 ? diff : (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tren Laporan Masuk</CardTitle>
                <CardDescription>Jumlah tiket yang masuk ({periodLabel})</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[280px] w-full" role="img" aria-label={`Tren laporan masuk per hari, periode ${periodLabel}`}>
                    <AreaChart accessibilityLayer data={data} margin={{ left: 0, right: 12 }}>
                        <defs>
                            {CLASSIFICATION_SERIES.map((s) => (
                                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={`var(--color-${s.key})`} stopOpacity={0.45} />
                                    <stop offset="100%" stopColor={`var(--color-${s.key})`} stopOpacity={0.06} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={24} />
                        <YAxis tickLine={false} axisLine={false} domain={[0, 'dataMax']} tickCount={5} width={32} />
                        <ChartTooltip cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} content={<TrendTooltip />} />
                        <ChartLegend content={<ChartLegendContent verticalAlign="bottom" />} />
                        {sortedSeries.map((s) => (
                            <Area
                                key={s.key}
                                dataKey={s.key}
                                type="monotone"
                                fill={`url(#fill-${s.key})`}
                                fillOpacity={0.25}
                                stroke={`var(--color-${s.key})`}
                                strokeWidth={2}
                                activeDot={{ r: 4, stroke: s.color, strokeWidth: 1 }}
                            />
                        ))}
                    </AreaChart>
                </ChartContainer>
            </CardContent>
            <CardFooter>
                <div className="grid gap-2 text-sm">
                    <div className="leading-none font-medium">Total {sum} tiket pada periode ini</div>
                    <div className="text-muted-foreground leading-none">
                        {sum > 0 ? `Puncak: ${peak.total} tiket (${peak.label})` : 'Belum ada tiket pada periode ini'}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        {sortedSeries.map((s) => (
                            <span key={s.key} className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: s.color }} />
                                <span className="text-muted-foreground">{s.label}</span>
                                <span className="font-mono font-medium tabular-nums">{totals[s.key]}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}
