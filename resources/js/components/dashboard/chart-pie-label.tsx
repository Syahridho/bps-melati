'use client';

import { Label, Pie, PieChart } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { type DashboardStats } from '@/types/dashboard';

type ClassificationKey = 'pengaduan' | 'aspirasi' | 'permintaan_informasi';

// Warna sama dengan badge klasifikasi (red-500, yellow-500, indigo-500)
const chartConfig = {
    total: { label: 'Laporan' },
    pengaduan: { label: 'Pengaduan', color: '#ef4444' },
    aspirasi: { label: 'Aspirasi', color: '#eab308' },
    permintaan_informasi: { label: 'Permintaan Informasi', color: '#6366f1' },
} satisfies ChartConfig;

const classificationKeys: ClassificationKey[] = ['pengaduan', 'aspirasi', 'permintaan_informasi'];

export function ChartPieLabel({ stats }: { stats: DashboardStats }) {
    const all = classificationKeys.map((key) => ({
        key,
        label: chartConfig[key].label,
        color: chartConfig[key].color,
        total: stats[key] ?? 0,
    }));

    const sum = all.reduce((acc, item) => acc + item.total, 0);

    // Irisan dengan nilai 0 tidak digambar
    const chartData = all
        .filter((item) => item.total > 0)
        .map((item) => ({
            key: item.key,
            total: item.total,
            fill: item.color,
        }));

    return (
        <Card className="flex h-full flex-col">
            <CardHeader className="items-center pb-0 text-center">
                <CardTitle className="text-xl">Klasifikasi Laporan</CardTitle>
                <CardDescription>Pengaduan, aspirasi, dan permintaan informasi</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-6 pb-6">
                <div className="flex flex-1 items-center justify-center">
                    {sum === 0 ? (
                        <div className="text-muted-foreground flex h-[250px] items-center justify-center text-sm">Belum ada data laporan</div>
                    ) : (
                        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px] w-full max-w-[250px] shrink-0">
                            <PieChart>
                                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
                                <Pie data={chartData} dataKey="total" nameKey="key" innerRadius={70} strokeWidth={4}>
                                    <Label
                                        content={({ viewBox }) => {
                                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                                return (
                                                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                                                            {sum}
                                                        </tspan>
                                                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-xs">
                                                            Laporan
                                                        </tspan>
                                                    </text>
                                                );
                                            }
                                        }}
                                    />
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                    )}
                </div>

                {/* Penjelasan warna */}
                <ul className="mt-auto grid grid-cols-1 gap-2 text-sm">
                    {all.map((item) => {
                        const percent = sum > 0 ? ((item.total / sum) * 100).toFixed(1) : '0.0';
                        return (
                            <li key={item.key} className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
                                <span className="text-muted-foreground truncate">{item.label}</span>
                                <span className="text-foreground ml-auto font-mono font-medium tabular-nums">
                                    {item.total}
                                    <span className="text-muted-foreground ml-1 text-xs font-normal">({percent}%)</span>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </CardContent>
        </Card>
    );
}
