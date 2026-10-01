"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"

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

type ClassificationStats = {
  total: number
  pengaduan: number
  aspirasi: number
  permintaan_informasi: number
}

// Warna tetap per klasifikasi
const chartConfig = {
  total: {
    label: "Tiket",
  },
  pengaduan: {
    label: "Pengaduan",
    color: "#f87171", // red-400
  },
  aspirasi: {
    label: "Aspirasi",
    color: "#facc15", // yellow-400
  },
  permintaan_informasi: {
    label: "Permintaan Informasi",
    color: "#818cf8", // indigo-400
  },
} satisfies ChartConfig

type ClassificationKey = Exclude<keyof typeof chartConfig, "total">

const keys: ClassificationKey[] = ["pengaduan", "aspirasi", "permintaan_informasi"]

export function ChartPieDonutText({ stats }: { stats: ClassificationStats }) {
  const items = React.useMemo(
    () =>
      keys.map((key) => ({
        key,
        label: chartConfig[key].label,
        color: chartConfig[key].color,
        value: stats[key] ?? 0,
      })),
    [stats],
  )

  // Irisan bernilai 0 tidak digambar
  const chartData = items
    .filter((item) => item.value > 0)
    .map((item) => ({
      classification: item.key,
      total: item.value,
      fill: `var(--color-${item.key})`,
    }))

  // Total di tengah memakai stats.total (jumlah seluruh tiket)
  const total = stats.total ?? 0

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-xl">Klasifikasi Laporan</CardTitle>
        <CardDescription className="text-md">Pengaduan, aspirasi, dan permintaan informasi</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {total === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Belum ada data tiket
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey="total"
                nameKey="classification"
                innerRadius={60}
                paddingAngle={2}
                stroke="var(--background)"
                strokeWidth={4}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {total.toLocaleString("id-ID")}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground"
                          >
                            Total Tiket
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-3 text-sm">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">
                {item.label}: <b className="text-foreground">{item.value}</b>
              </span>
            </div>
          ))}
        </div>
      </CardFooter>
    </Card>
  )
}