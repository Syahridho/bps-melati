"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

export type TrendPoint = {
  label: string
  total: number
}

const chartConfig = {
  total: {
    label: "Tiket",
    color: "#38bdf8", // sky-400
  },
} satisfies ChartConfig

export function ChartAreaLinear({
  data,
  periodLabel,
}: {
  data: TrendPoint[]
  periodLabel: string
}) {
  const sum = data.reduce((acc, item) => acc + item.total, 0)
  const peak = data.reduce(
    (max, item) => (item.total > max.total ? item : max),
    data[0] ?? { label: "-", total: 0 },
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tren Laporan Masuk</CardTitle>
        <CardDescription>Jumlah tiket yang masuk ({periodLabel})</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="total"
              type="linear"
              fill="var(--color-total)"
              fillOpacity={0.35}
              stroke="var(--color-total)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="grid gap-2 text-sm">
          <div className="leading-none font-medium">
            Total {sum} tiket pada periode ini
          </div>
          <div className="leading-none text-muted-foreground">
            {sum > 0
              ? `Puncak: ${peak.total} tiket (${peak.label})`
              : "Belum ada tiket pada periode ini"}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}