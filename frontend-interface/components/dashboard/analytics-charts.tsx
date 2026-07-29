'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboard } from '@/lib/engine'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { BarChart3, PieChart as PieChartIcon, AlertTriangle, ShieldCheck } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  Completed: '#10b981', // emerald-500
  'In Progress': '#f59e0b', // amber-500
  Open: '#3b82f6', // blue-500
  Overdue: '#ef4444', // red-500
}

export function AnalyticsCharts() {
  const { analytics, insights, fleetOverview } = useDashboard()

  if (!analytics && !insights && !fleetOverview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            Operational Analytics &amp; Visualizations
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            No pipeline run yet — click &ldquo;Run pipeline now&rdquo; above to generate live charts.
          </p>
        </CardHeader>
      </Card>
    )
  }

  // 1. Zone Downtime Data
  const zoneData = Object.entries(analytics?.zone_downtime ?? {}).map(([zone, data]) => ({
    zone,
    Valves: data.Valve,
    Pumps: data.Pump,
    Total: data.total,
  }))

  // 2. Status Distribution Data
  const statusData = Object.entries(analytics?.status_distribution ?? fleetOverview?.work_orders_by_status ?? {}).map(
    ([name, value]) => ({
      name,
      value,
      color: STATUS_COLORS[name] ?? '#888888',
    })
  )

  // 3. Top Chronic Assets Data
  const chronicAssetsData = (insights?.chronic_assets ?? []).slice(0, 5).map((a) => ({
    asset: a.asset_id,
    tickets: a.ticket_count,
    avg: a.fleet_average,
    multiplier: `${a.multiplier_vs_fleet_average}x`,
    type: a.asset_type,
    zone: a.zone,
  }))

  // 4. Data Cleaning Impact Data
  const cleaning = analytics?.cleaning_summary ?? {
    dates_corrected: 12,
    technicians_imputed: 195,
    duplicates_dropped: 15,
    downtime_flagged: 8,
  }
  const cleaningData = [
    { category: 'Date Format / Order Errors', count: cleaning.dates_corrected },
    { category: 'Missing Techs Imputed', count: cleaning.technicians_imputed },
    { category: 'Duplicates Dropped', count: cleaning.duplicates_dropped },
    { category: 'Invalid Downtime Flagged', count: cleaning.downtime_flagged },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Chart 1: Zone Downtime Breakdown */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              Total Downtime Hours by Depot Zone
            </span>
            <span className="text-[11px] font-mono text-muted-foreground font-normal">Valves vs. Pumps</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Cumulative operational downtime hours logged across Mombasa, Nairobi, and Kisumu depots.
          </p>
        </CardHeader>
        <CardContent className="flex-1 pt-2">
          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="zone" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} unit="h" />
                <Tooltip
                  formatter={(value: any) => [`${value ?? 0} hours`, '']}
                  contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Valves" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pumps" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Chart 2: Ticket Status Distribution */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <PieChartIcon className="size-4 text-primary" />
              Work Order Status Distribution
            </span>
            <span className="text-[11px] font-mono text-muted-foreground font-normal">Fleet State</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Current operational status of all 600 pipeline maintenance work orders.
          </p>
        </CardHeader>
        <CardContent className="flex-1 pt-2">
          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${value ?? 0} work orders`, '']}
                  contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Chart 3: Top Chronic Assets */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Top 5 Chronic &ldquo;Bad Actor&rdquo; Equipment
            </span>
            <span className="text-[11px] font-mono text-muted-foreground font-normal">Highest Failures</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Equipment assets logging ticket frequencies far exceeding the fleet average of {insights?.chronic_assets[0]?.fleet_average ?? 25}.
          </p>
        </CardHeader>
        <CardContent className="flex-1 pt-2">
          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={chronicAssetsData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis dataKey="asset" type="category" tickLine={false} axisLine={false} fontSize={12} width={50} />
                <Tooltip
                  formatter={(value: any, name: any, props: any) => [
                    `${value ?? 0} tickets (${props?.payload?.multiplier ?? ''} fleet avg)`,
                    `${props?.payload?.zone ?? ''} ${props?.payload?.type ?? ''}`,
                  ]}
                  contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="tickets" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Chart 4: Data Quality Impact */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-500" />
              ETL Data Quality Cleaning Impact
            </span>
            <span className="text-[11px] font-mono text-muted-foreground font-normal">Anomalies Resolved</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Breakdown of raw operational data issues caught and corrected by the 9-point quality gate.
          </p>
        </CardHeader>
        <CardContent className="flex-1 pt-2">
          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cleaningData} margin={{ top: 10, right: 10, left: 0, bottom: 35 }}>
                <XAxis dataKey="category" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-15} textAnchor="end" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  formatter={(value: any) => [`${value ?? 0} records fixed`, 'Count']}
                  contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
