import { DashboardHeader } from '@/components/dashboard/header'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { PipelineFlow } from '@/components/dashboard/pipeline-flow'
import { ConsoleTabs } from '@/components/dashboard/console-tabs'

export default function Page() {
  return (
    <div className="min-h-dvh">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <section className="space-y-2 rounded-xl border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              
            </span>
            <span className="text-xs font-mono text-muted-foreground">Kenya Pipeline Company (KPC)</span>
          </div>
          <h2 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
            Automating KPC Maintenance Dispatch &amp; Eliminating Downtime Delays
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-4xl">
            Ingesting messy field work orders, enforcing a 9-point CI quality gate, and auto-dispatching high-priority tickets via a monitored CMMS API scheduler in <strong>&lt;0.2 seconds</strong>.
          </p>
        </section>

        <KpiCards />
        <PipelineFlow />
        <ConsoleTabs />

        <footer className="pt-4 text-xs text-muted-foreground">
          Data from a live ETL + scheduler run against simulated KPC maintenance work orders. Mock
          CMMS API stands in until real ticketing-system access is granted.
        </footer>
      </main>
    </div>
  )
}
