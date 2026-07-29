'use client'

import { useMemo, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { PRIORITY_COLORS, ZONE_COLORS } from '@/lib/data'
import { useDashboard } from '@/lib/engine'
import { Loader2, Play, Search, Filter } from 'lucide-react'

const latencyConfig = {
  latency: { label: 'Latency (ms)', color: 'var(--chart-1)' },
  retry: { label: 'Needed retry', color: 'var(--chart-4)' },
} satisfies ChartConfig

const breakdownConfig = {
  count: { label: 'Tickets' },
} satisfies ChartConfig

export function SchedulerPerformance() {
  const {
    tickets,
    avgLatencyMs,
    schedulerPhase,
    schedulerError,
    pipelinePhase,
    runScheduler,
  } = useDashboard()

  const running = schedulerPhase === 'running'
  const canRun = pipelinePhase === 'done'

  // Filter state for Tickets Explorer
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [attemptFilter, setAttemptFilter] = useState('all')

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        (t.ticket_id ?? '').toLowerCase().includes(q) ||
        t.work_order_id.toLowerCase().includes(q) ||
        t.asset_id.toLowerCase().includes(q) ||
        (t.error ?? '').toLowerCase().includes(q)
      const matchPriority = priorityFilter === 'all' || t.priority.toLowerCase() === priorityFilter.toLowerCase()
      const matchZone = zoneFilter === 'all' || t.zone.toLowerCase() === zoneFilter.toLowerCase()
      const matchAttempt =
        attemptFilter === 'all' ||
        (attemptFilter === 'retry' && t.attempts > 1) ||
        (attemptFilter === 'single' && t.attempts === 1)

      return matchSearch && matchPriority && matchZone && matchAttempt
    })
  }, [tickets, search, priorityFilter, zoneFilter, attemptFilter])

  const chartData = useMemo(
    () =>
      tickets.map((t, i) => ({
        index: i + 1,
        latency: t.latency_ms,
        retry: t.attempts > 1 ? t.latency_ms : null,
      })),
    [tickets],
  )

  const live = useMemo(() => {
    const n = tickets.length || 1
    const success = tickets.filter((t) => t.success).length
    const retries = tickets.filter((t) => t.attempts > 1).length
    const avg = tickets.reduce((s, t) => s + t.latency_ms, 0) / n
    return {
      count: tickets.length,
      successRate: tickets.length ? Math.round((success / tickets.length) * 100) : 0,
      avg: tickets.length ? Math.round(avg) : 0,
      retries,
    }
  }, [tickets])

  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of tickets) counts[t.priority] = (counts[t.priority] ?? 0) + 1
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: PRIORITY_COLORS[name] ?? 'var(--chart-5)',
    }))
  }, [tickets])

  const zoneData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of tickets) counts[t.zone] = (counts[t.zone] ?? 0) + 1
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: ZONE_COLORS[name] ?? 'var(--chart-5)',
    }))
  }, [tickets])

  const retryTickets = useMemo(() => tickets.filter((t) => t.attempts > 1).slice(0, 8), [tickets])

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Scheduler run — latency per ticket</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Every real API call from the last run, in order. Orange points needed a retry.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Button onClick={runScheduler} disabled={running || !canRun} size="sm" className="shrink-0">
              {running ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Running…
                </>
              ) : (
                <>
                  <Play className="size-4" aria-hidden="true" /> Run scheduler now
                </>
              )}
            </Button>
            {!canRun && <p className="text-[11px] text-muted-foreground">Run the pipeline first</p>}
          </div>
        </CardHeader>
        <CardContent>
          {schedulerError && (
            <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {schedulerError}
            </p>
          )}

          <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Tickets', value: live.count },
              { label: 'Success rate', value: tickets.length ? `${live.successRate}%` : '–' },
              { label: 'Avg latency', value: tickets.length ? `${live.avg}ms` : '–' },
              { label: 'Retries', value: live.retries },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-muted/40 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="font-mono text-lg font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>

          {tickets.length === 0 ? (
            <p className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              No scheduler run yet.
            </p>
          ) : (
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
                  y={avgLatencyMs}
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
          )}
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

      {/* Full Dispatched CMMS Tickets Explorer Table */}
      <Card>
        <CardHeader className="space-y-3 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Dispatched CMMS Tickets Explorer</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                Official maintenance tickets auto-created and posted to the CMMS API during the latest scheduler run.
              </p>
            </div>
            <Badge variant="outline" className="w-fit font-mono text-xs">
              {filteredTickets.length} of {tickets.length} Matches
            </Badge>
          </div>

          {/* Filter Toolbar */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 pt-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search Ticket, WO#, Asset..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-muted-foreground shrink-0" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Zones</option>
                <option value="mombasa">Mombasa</option>
                <option value="nairobi">Nairobi</option>
                <option value="kisumu">Kisumu</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={attemptFilter}
                onChange={(e) => setAttemptFilter(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Attempts</option>
                <option value="single">First Attempt Success</option>
                <option value="retry">Required Retry (&gt;1 Attempt)</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No tickets dispatched yet — click &ldquo;Run scheduler now&rdquo; above to execute candidate selection and API post.
            </p>
          ) : filteredTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No tickets match the selected filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Ticket ID</th>
                    <th className="pb-2 pr-4 font-medium">Work Order</th>
                    <th className="pb-2 pr-4 font-medium">Asset ID</th>
                    <th className="pb-2 pr-4 font-medium">Zone</th>
                    <th className="pb-2 pr-4 font-medium">Priority</th>
                    <th className="pb-2 pr-4 font-medium">API Response</th>
                    <th className="pb-2 pr-4 text-right font-medium">Attempts</th>
                    <th className="pb-2 text-right font-medium">Latency</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {filteredTickets.map((t) => (
                    <tr key={t.ticket_id ?? t.work_order_id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2.5 pr-4 font-semibold text-primary">{t.ticket_id ?? 'PENDING'}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{t.work_order_id}</td>
                      <td className="py-2.5 pr-4 font-bold">{t.asset_id}</td>
                      <td className="py-2.5 pr-4 font-sans">{t.zone}</td>
                      <td className="py-2.5 pr-4">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="py-2.5 pr-4">
                        {t.success ? (
                          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                            200 OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            {t.error ?? 'Failed'}
                          </Badge>
                        )}
                      </td>
                      <td className={`py-2.5 pr-4 text-right ${t.attempts > 1 ? 'text-amber-500 font-bold' : ''}`}>
                        {t.attempts} {t.attempts > 1 ? '(Retry)' : ''}
                      </td>
                      <td className="py-2.5 text-right font-mono">{t.latency_ms}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transient Retry Telemetry Log</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Calls the monitoring layer caught and recovered — the mock CMMS injects a ~5% transient
            failure rate, and every one still resolved via retry.
          </p>
        </CardHeader>
        <CardContent>
          {retryTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No retries logged in this run.</p>
          ) : (
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
                    <tr key={t.ticket_id ?? t.work_order_id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{t.ticket_id ?? '—'}</td>
                      <td className="py-2 pr-4">{t.asset_id}</td>
                      <td className="py-2 pr-4 font-sans">{t.zone}</td>
                      <td className="py-2 pr-4">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="py-2 pr-4 text-right text-amber-500 font-bold">{t.attempts}</td>
                      <td className="py-2 text-right">{t.latency_ms}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <>
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
          </>
        )}
      </CardContent>
    </Card>
  )
}
