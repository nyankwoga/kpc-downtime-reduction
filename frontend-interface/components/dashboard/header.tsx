'use client'

import { Activity, Download } from 'lucide-react'
import { useDashboard } from '@/lib/engine'
import { ThemeToggle } from './theme-toggle'
import { Button } from '@/components/ui/button'

export function DashboardHeader() {
  const { qualityReport, lastRun, hydrating } = useDashboard()

  const stamp = lastRun
    ? new Date(lastRun).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : hydrating
      ? 'Checking backend…'
      : 'Not run yet'

  const gateLabel = qualityReport ? `Gate ${qualityReport.gate_status}` : 'Gate idle'
  const gateOk = qualityReport?.gate_status === 'PASS'

  const downloadPdf = () => {
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')
    window.open(`${baseUrl}/api/report/pdf`, '_blank')
  }

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
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              qualityReport
                ? gateOk
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'border-muted-foreground/20 bg-muted text-muted-foreground'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${qualityReport ? 'animate-pulse' : ''} ${
                qualityReport ? (gateOk ? 'bg-success' : 'bg-destructive') : 'bg-muted-foreground'
              }`}
              aria-hidden="true"
            />
            {gateLabel}
          </span>
          <Button variant="outline" size="sm" onClick={downloadPdf} className="gap-1.5 text-xs">
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Download Report (PDF)</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
