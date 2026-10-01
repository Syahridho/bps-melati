"use client"

import { Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type ChannelKey =
  | "span_lapor"
  | "sosial_media"
  | "kunjungan_langsung"
  | "wbs"
  | "email"

type ChannelStats = Record<ChannelKey, number>

// Warna tetap per kanal (samakan dengan warna kartu)
const chartConfig = {
  total: {
    label: "Tiket",
  },
  span_lapor: {
    label: "SP4N-LAPOR!",
    color: "#a78bfa", // violet-400
  },
  sosial_media: {
    label: "Sosial Media",
    color: "#f472b6", // pink-400
  },
  kunjungan_langsung: {
    label: "Kunjungan Langsung",
    color: "#a3e635", // lime-400
  },
  wbs: {
    label: "WBS",
    color: "#fb923c", // orange-400
  },
  email: {
    label: "Email",
    color: "#2dd4bf", // teal-400
  },
  website: {
    label: "Website",
    color: "#38bdf8", // sky-400
  },
} satisfies ChartConfig

const channelKeys = Object.keys(chartConfig).filter(
  (k) => k !== "total",
) as ChannelKey[]

export function ChartPieLabel({ stats }: { stats: ChannelStats }) {
  const all = channelKeys.map((key) => ({
    key,
    label: chartConfig[key].label,
    color: chartConfig[key].color,
    total: stats[key] ?? 0,
  }))

  // Kanal dengan nilai 0 tidak digambar di pie
  const chartData = all
    .filter((item) => item.total > 0)
    .map((item) => ({
      channel: item.key,
      total: item.total,
      fill: `var(--color-${item.key})`,
    }))

  const sum = all.reduce((acc, item) => acc + item.total, 0)

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-xl">Sumber Kanal</CardTitle>
        <CardDescription className="">Sumber laporan yang masuk</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {sum === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Belum ada data tiket
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px] pb-0 [&_.recharts-pie-label-text]:fill-foreground"
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartData}
                dataKey="total"
                nameKey="channel"
                label
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
 
    </Card>
  )
}