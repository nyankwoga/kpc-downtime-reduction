import { Activity } from 'lucide-react'
import { data } from '@/lib/data'
import { ThemeToggle } from './theme-toggle'

export function DashboardHeader() {
  const exportedAt = new Date(data.exported_at)
  const stamp = exportedAt.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-sm font-semibold leading-tight sm:text-base">
              KPC Downtime Reduction Console
            </h1>
            <p className="text-xs text-muted-foreground">
              Maintenance automation &middot; Domain B, Problem 4
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Last run</p>
            <p className="font-mono text-xs text-foreground">{stamp}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
            <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />
            Gate {data.quality_report.gate_status}
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
