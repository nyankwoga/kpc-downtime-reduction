'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QualityGate } from './quality-gate'
import { ChronicAssets } from './chronic-assets'
import { SchedulerPerformance } from './scheduler-performance'
import { ShieldCheck, AlertTriangle, Gauge } from 'lucide-react'

export function ConsoleTabs() {
  return (
    <Tabs defaultValue="quality" className="gap-4">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1 sm:w-auto">
        <TabsTrigger value="quality" className="gap-1.5 data-[state=active]:text-primary">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Quality gate
        </TabsTrigger>
        <TabsTrigger value="insights" className="gap-1.5 data-[state=active]:text-primary">
          <AlertTriangle className="size-4" aria-hidden="true" />
          Chronic assets
        </TabsTrigger>
        <TabsTrigger value="scheduler" className="gap-1.5 data-[state=active]:text-primary">
          <Gauge className="size-4" aria-hidden="true" />
          Scheduler performance
        </TabsTrigger>
      </TabsList>

      <TabsContent value="quality">
        <QualityGate />
      </TabsContent>
      <TabsContent value="insights">
        <ChronicAssets />
      </TabsContent>
      <TabsContent value="scheduler">
        <SchedulerPerformance />
      </TabsContent>
    </Tabs>
  )
}
