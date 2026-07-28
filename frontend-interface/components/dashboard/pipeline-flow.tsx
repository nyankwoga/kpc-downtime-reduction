'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDashboard } from '@/lib/engine'
import { ChevronRight, Loader2, Play } from 'lucide-react'

export function PipelineFlow() {
  const { pipelinePhase, pipelineError, qualityReport, fleetOverview, rowsCleaned, runPipeline } =
    useDashboard()

  const running = pipelinePhase === 'running'
  const done = pipelinePhase === 'done'

  const stages = [
    {
      key: 'extract',
      label: 'Extract',
      value: rowsCleaned != null ? String(fleetOverview?.total_work_orders ?? '–') : '–',
      unit: 'raw rows read',
      /*note: 'CMMS export',*/
    },
    {
      key: 'transform',
      label: 'Transform',
      value: rowsCleaned != null ? String(rowsCleaned) : '–',
      unit: 'clean rows',
      /*note: 'Deduped & normalized',*/
    },
    {
      key: 'gate',
      label: 'Quality gate',
      value: qualityReport ? `${qualityReport.passed}/${qualityReport.total}` : '–',
      unit: 'checks pass',
      /*note: 'CI-enforced',*/
    },
    {
      key: 'load',
      label: 'Load',
      value: fleetOverview ? String(fleetOverview.total_assets) : '–',
      unit: fleetOverview ? `assets · ${Object.keys(fleetOverview.assets_by_zone).length} zones` : 'assets',
      /*note: 'Idempotent SQLite',*/
    },
  ] as const

  return (
    <Card className="gap-0 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Automated ETL &rarr; scheduler pipeline</h2>
          <p className="text-xs text-muted-foreground">
            Extract &middot; clean &middot; quality-gate &middot; load - click to run it live against the backend
          </p>
        </div>
        <div className="flex items-center gap-2">
          {done && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />
              Pipeline healthy
            </span>
          )}
          <Button onClick={runPipeline} disabled={running} size="sm">
            {running ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Running…
              </>
            ) : (
              <>
                <Play className="size-4" aria-hidden="true" /> Run pipeline now
              </>
            )}
          </Button>
        </div>
      </div>

      {pipelineError && (
        <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {pipelineError}
        </p>
      )}

      <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
        {stages.map((stage, i) => (
          <li key={stage.key} className="flex flex-1 items-center gap-2">
            <div className="flex-1 rounded-lg border bg-muted/40 px-3 py-3">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {stage.label}
                </span>
              </div>
              <p className="mt-1.5 font-mono text-lg font-semibold tracking-tight text-foreground">
                {stage.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{stage.unit}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/80">{stage.note}</p>
            </div>
            {i < stages.length - 1 && (
              <ChevronRight
                className="hidden size-4 shrink-0 text-muted-foreground/50 lg:block"
                aria-hidden="true"
              />
            )}
          </li>
        ))}
      </ol>
    </Card>
  )
}
