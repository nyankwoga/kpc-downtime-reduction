'use client'

import { Card } from '@/components/ui/card'
import { useDashboard } from '@/lib/engine'
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
  const { qualityReport: qr, insights, tickets, totalCandidates, succeeded, avgLatencyMs } =
    useDashboard()

  const retried = tickets.filter((t) => t.attempts > 1).length
  const successRate = totalCandidates ? Math.round((succeeded / totalCandidates) * 100) : 0

  const kpis: Kpi[] = [
    {
      label: 'Data quality gate',
      value: qr ? `${qr.passed}/${qr.total}` : '–',
      sub: qr ? `${qr.gate_status} · CI-enforced on every commit` : 'Run pipeline to check',
      icon: ShieldCheck,
      tone: 'success',
    },
    {
      label: 'Tickets auto-created',
      value: totalCandidates ? `${succeeded}` : '–',
      sub: totalCandidates
        ? `${successRate}% success across ${totalCandidates} candidates`
        : 'Run scheduler to generate',
      icon: TicketCheck,
      tone: 'primary',
    },
    {
      label: 'Avg API latency',
      value: totalCandidates ? `${avgLatencyMs}ms` : '–',
      sub: totalCandidates ? `${retried} calls needed a retry` : 'No scheduler run yet',
      icon: Gauge,
      tone: 'primary',
    },
    {
      label: 'Chronic-failure assets',
      value: insights ? `${insights.chronic_assets_found}` : '–',
      sub: insights
        ? `of ${insights.total_assets_analyzed} assets · ${Math.round(insights.chronic_asset_rate * 100)}% of fleet`
        : 'Run pipeline to analyze',
      icon: AlertTriangle,
      tone: 'warning',
    },
    {
      label: 'Retries handled',
      value: totalCandidates ? `${retried}` : '–',
      sub: 'Transient failures recovered automatically',
      icon: RefreshCw,
      tone: 'muted',
    },
    {
      label: 'Double-bookings caught',
      value: qr ? `${qr.technician_double_bookings_found}` : '–',
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
