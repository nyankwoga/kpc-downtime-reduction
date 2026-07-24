import { Card } from '@/components/ui/card'
import { PIPELINE_STAGES } from '@/lib/data'
import { ChevronRight } from 'lucide-react'

export function PipelineFlow() {
  return (
    <Card className="gap-0 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Automated ETL &rarr; scheduler pipeline</h2>
          <p className="text-xs text-muted-foreground">
            Extract &middot; clean &middot; quality-gate &middot; load &middot; auto-ticket — the full Stage 1 flow
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
          <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />
          Pipeline healthy
        </span>
      </div>

      <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
        {PIPELINE_STAGES.map((stage, i) => (
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
            {i < PIPELINE_STAGES.length - 1 && (
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
