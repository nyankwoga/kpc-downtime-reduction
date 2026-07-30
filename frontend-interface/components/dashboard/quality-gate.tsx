'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CHECK_LABELS } from '@/lib/data'
import { useDashboard } from '@/lib/engine'
import { Check, X } from 'lucide-react'

export function QualityGate() {
  const { qualityReport } = useDashboard()

  if (!qualityReport) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data quality gate</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            No pipeline run yet - click &ldquo;Run pipeline now&rdquo; above to fetch live results
            from the backend.
          </p>
        </CardHeader>
      </Card>
    )
  }

  const { checks, passed, total } = qualityReport
  const entries = Object.entries(checks)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Data quality gate</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Ten named expectations, each pass/fail, blocking the CI build on every commit.
          </p>
        </div>
        <Badge
          variant="outline"
          className={`shrink-0 font-mono ${
            passed === total
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {passed}/{total} {passed === total ? 'PASS' : 'FAIL'}
        </Badge>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2">
          {entries.map(([key, ok]) => {
            const meta = CHECK_LABELS[key] ?? { label: key, detail: '' }
            return (
              <li
                key={key}
                className="flex items-start gap-3 rounded-lg border bg-card p-3"
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                    ok ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                  }`}
                >
                  {ok ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <X className="size-3.5" aria-hidden="true" />
                  )}
                  <span className="sr-only">{ok ? 'Passing' : 'Failing'}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{meta.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{meta.detail}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
