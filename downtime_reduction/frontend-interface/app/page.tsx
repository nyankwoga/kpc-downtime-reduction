import { DashboardHeader } from '@/components/dashboard/header'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { PipelineFlow } from '@/components/dashboard/pipeline-flow'
import { ConsoleTabs } from '@/components/dashboard/console-tabs'

export default function Page() {
  return (
    <div className="min-h-dvh">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <section className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Inuka Hackathon &middot; Stage 1 &middot; Data Engineering
          </p>
          <h2 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl">
            From messy work orders to auto-created maintenance tickets — and proof the automation is
            reliable.
          </h2>
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
