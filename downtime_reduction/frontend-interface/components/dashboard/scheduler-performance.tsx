'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { data, PRIORITY_COLORS, ZONE_COLORS } from '@/lib/data'
import { Play, RotateCcw } from 'lucide-react'

const run = data.scheduler_run
const tickets = run.tickets

const latencyConfig = {
  latency: { label: 'Latency (ms)', color: 'var(--chart-1)' },
  retry: { label: 'Needed retry', color: 'var(--chart-4)' },
} satisfies ChartConfig

const breakdownConfig = {
  count: { label: 'Tickets' },
} satisfies ChartConfig

function useReplay() {
  const [count, setCount] = useState(tickets.length)
  const [running, setRunning] = useState(false)
  const rafRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setRunning(false)
  }, [])

  const start = useCallback(() => {
    stop()
    setCount(0)
    setRunning(true)
    let i = 0
    const batch = 3
    const tick = () => {
      i = Math.min(i + batch, tickets.length)
      setCount(i)
      if (i < tickets.length) {
        rafRef.current = requestAnimationFrame(() => {
          setTimeout(tick, 16)
        })
      } else {
        setRunning(false)
      }
    }
    tick()
  }, [stop])

  useEffect(() => () => stop(), [stop])

  return { count, running, start }
}

export function SchedulerPerformance() {
  const { count, running, start } = useReplay()

  const shown = useMemo(() => tickets.slice(0, count), [count])

  const chartData = useMemo(
    () =>
      shown.map((t, i) => ({
        index: i + 1,
        latency: t.latency_ms,
        retry: t.attempts > 1 ? t.latency_ms : null,
      })),
    [shown],
  )

  const live = useMemo(() => {
    const n = shown.length || 1
    const success = shown.filter((t) => t.success).length
    const retries = shown.filter((t) => t.attempts > 1).length
    const avg = shown.reduce((s, t) => s + t.latency_ms, 0) / n
    return {
      count: shown.length,
      successRate: shown.length ? Math.round((success / shown.length) * 100) : 0,
      avg: shown.length ? Math.round(avg) : 0,
      retries,
    }
  }, [shown])

  const priorityData = useMemo(
    () =>
      Object.entries(run.priority_breakdown).map(([name, value]) => ({
        name,
        value,
        fill: PRIORITY_COLORS[name] ?? 'var(--chart-5)',
      })),
    [],
  )

  const zoneData = useMemo(
    () =>
      Object.entries(run.zone_breakdown).map(([name, value]) => ({
        name,
        value,
        fill: ZONE_COLORS[name] ?? 'var(--chart-5)',
      })),
    [],
  )

  const retryTickets = useMemo(() => tickets.filter((t) => t.attempts > 1).slice(0, 8), [])

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Scheduler run — latency per ticket</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Every API call from the last Cron run, in order. Orange points needed a retry.
            </p>
          </div>
          <Button onClick={start} disabled={running} size="sm" className="shrink-0">
            {running ? (
              <>
                <RotateCcw className="size-4 animate-spin" aria-hidden="true" /> Replaying…
              </>
            ) : (
              <>
                <Play className="size-4" aria-hidden="true" /> Replay run
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Tickets', value: live.count },
              { label: 'Success rate', value: `${live.successRate}%` },
              { label: 'Avg latency', value: `${live.avg}ms` },
              { label: 'Retries', value: live.retries },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-muted/40 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="font-mono text-lg font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>

          <ChartContainer config={latencyConfig} className="h-[260px] w-full">
            <AreaChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="fillLatency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-latency)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-latency)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="index"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={40}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={38}
                fontSize={11}
                tickFormatter={(v) => `${v}`}
                label={{ value: 'ms', angle: 0, position: 'insideTopLeft', fontSize: 10 }}
              />
              <ReferenceLine
                y={run.avg_latency_ms}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(_, p) => `Call #${p?.[0]?.payload?.index ?? ''}`}
                  />
                }
                cursor={{ stroke: 'var(--border)' }}
              />
              <Area
                type="monotone"
                dataKey="latency"
                stroke="var(--color-latency)"
                strokeWidth={2}
                fill="url(#fillLatency)"
                isAnimationActive={false}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="retry"
                stroke="transparent"
                fill="transparent"
                isAnimationActive={false}
                dot={{ r: 3, fill: 'var(--color-retry)', strokeWidth: 0 }}
                connectNulls={false}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Tickets by priority"
          description="Overdue and short-SLA work orders escalate to high."
          config={breakdownConfig}
          chartData={priorityData}
        />
        <BreakdownCard
          title="Tickets by depot zone"
          description="Distribution across Mombasa, Nairobi and Kisumu."
          config={breakdownConfig}
          chartData={zoneData}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Retry log</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Calls the monitoring layer caught and recovered — the mock CMMS injects a ~5% transient
            failure rate, and every one still resolved via retry.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Ticket</th>
                  <th className="pb-2 pr-4 font-medium">Asset</th>
                  <th className="pb-2 pr-4 font-medium">Zone</th>
                  <th className="pb-2 pr-4 font-medium">Priority</th>
                  <th className="pb-2 pr-4 text-right font-medium">Attempts</th>
                  <th className="pb-2 text-right font-medium">Latency</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {retryTickets.map((t) => (
                  <tr key={t.ticket_id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{t.ticket_id}</td>
                    <td className="py-2 pr-4">{t.asset_id}</td>
                    <td className="py-2 pr-4 font-sans">{t.zone}</td>
                    <td className="py-2 pr-4">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="py-2 pr-4 text-right text-warning">{t.attempts}</td>
                    <td className="py-2 text-right">{t.latency_ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === 'high'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : priority === 'medium'
        ? 'border-warning/30 bg-warning/10 text-warning'
        : 'border-success/30 bg-success/10 text-success'
  return (
    <Badge variant="outline" className={`font-sans capitalize ${tone}`}>
      {priority}
    </Badge>
  )
}

function BreakdownCard({
  title,
  description,
  config,
  chartData,
}: {
  title: string
  description: string
  config: ChartConfig
  chartData: { name: string; value: number; fill: string }[]
}) {
  const total = chartData.reduce((s, d) => s + d.value, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <ChartContainer config={config} className="aspect-square h-[160px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={44}
              outerRadius={70}
              strokeWidth={2}
              stroke="var(--card)"
            >
              {chartData.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="flex flex-1 flex-col gap-2">
          {chartData.map((d) => (
            <li key={d.name} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm" style={{ background: d.fill }} aria-hidden="true" />
                <span className="capitalize">{d.name}</span>
              </span>
              <span className="font-mono text-muted-foreground">
                {d.value}
                <span className="ml-1.5 text-xs">({Math.round((d.value / total) * 100)}%)</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
