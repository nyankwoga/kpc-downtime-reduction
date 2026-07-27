import { Card } from '@/components/ui/card'
import { data } from '@/lib/data'
import {
  ShieldCheck,
  AlertTriangle,
  TicketCheck,
  Gauge,
  RefreshCw,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Kpi = {
  label: string
  value: string
  sub: string
  icon: LucideIcon
  tone: 'success' | 'warning' | 'primary' | 'muted'
}

const toneStyles: Record<Kpi['tone'], string> = {
  success: 'text-success',
  warning: 'text-warning',
  primary: 'text-primary',
  muted: 'text-foreground',
}

const iconTone: Record<Kpi['tone'], string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  primary: 'bg-primary/10 text-primary',
  muted: 'bg-muted text-muted-foreground',
}

export function KpiCards() {
  const { quality_report: qr, insights, scheduler_run: run } = data
  const successRate = Math.round((run.succeeded / run.total_candidates) * 100)

  const kpis: Kpi[] = [
    {
      label: 'Data quality gate',
      value: `${qr.passed}/${qr.total}`,
      sub: `${qr.gate_status} · CI-enforced on every commit`,
      icon: ShieldCheck,
      tone: 'success',
    },
    {
      label: 'Tickets auto-created',
      value: `${run.succeeded}`,
      sub: `${successRate}% success across ${run.total_candidates} candidates`,
      icon: TicketCheck,
      tone: 'primary',
    },
    {
      label: 'Avg API latency',
      value: `${run.avg_latency_ms}ms`,
      sub: `${run.retried} calls needed a retry`,
      icon: Gauge,
      tone: 'primary',
    },
    {
      label: 'Chronic-failure assets',
      value: `${insights.chronic_assets_found}`,
      sub: `of ${insights.total_assets_analyzed} assets · ${Math.round(insights.chronic_asset_rate * 100)}% of fleet`,
      icon: AlertTriangle,
      tone: 'warning',
    },
    {
      label: 'Retries handled',
      value: `${run.retried}`,
      sub: 'Transient failures recovered automatically',
      icon: RefreshCw,
      tone: 'muted',
    },
    {
      label: 'Double-bookings caught',
      value: `${qr.technician_double_bookings_found}`,
      sub: 'Overlapping technician job windows',
      icon: Users,
      tone: 'warning',
    },
  ]

  return (
    <section aria-label="Key operational metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <Card key={kpi.label} className="gap-0 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium leading-tight text-muted-foreground text-pretty">
                {kpi.label}
              </span>
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-md ${iconTone[kpi.tone]}`}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <p className={`mt-3 font-mono text-2xl font-semibold tracking-tight ${toneStyles[kpi.tone]}`}>
              {kpi.value}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground text-pretty">{kpi.sub}</p>
          </Card>
        )
      })}
    </section>
  )
}
