'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { data } from '@/lib/data'
import { Droplets, Gauge as ValveIcon } from 'lucide-react'

export function ChronicAssets() {
  const { chronic_assets, total_assets_analyzed } = data.insights
  const [selected, setSelected] = useState(chronic_assets[0]?.asset_id ?? '')
  const active = chronic_assets.find((a) => a.asset_id === selected) ?? chronic_assets[0]
  const maxCount = Math.max(...chronic_assets.map((a) => a.ticket_count))
  const fleetAvg = chronic_assets[0]?.fleet_average ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chronic-failure assets</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Assets raising tickets well above the fleet average of {fleetAvg}. These are the first
          candidates for condition-based maintenance — actionable signal, not just clean rows.
        </p>
      </CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <ul className="flex flex-col gap-2" role="listbox" aria-label="Chronic assets">
          {chronic_assets.map((a) => {
            const isActive = a.asset_id === active?.asset_id
            const isValve = a.asset_type === 'Valve'
            const Icon = isValve ? ValveIcon : Droplets
            return (
              <li key={a.asset_id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => setSelected(a.asset_id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    isActive ? 'border-primary/40 bg-accent' : 'bg-card hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-mono text-sm font-semibold">{a.asset_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.zone} &middot; {a.asset_type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold">{a.ticket_count}</p>
                      <p className="text-[11px] text-warning">{a.multiplier_vs_fleet_average}&times; avg</p>
                    </div>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(a.ticket_count / maxCount) * 100}%` }}
                    />
                  </div>
                </button>
              </li>
            )
          })}
        </ul>

        {active && (
          <div className="flex flex-col justify-between rounded-xl border bg-muted/40 p-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-2xl font-semibold">{active.asset_id}</span>
                <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
                  High priority
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {active.asset_type} &middot; {active.zone} depot zone
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Tickets raised</dt>
                  <dd className="font-mono text-xl font-semibold">{active.ticket_count}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Fleet average</dt>
                  <dd className="font-mono text-xl font-semibold">{active.fleet_average}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Vs. fleet</dt>
                  <dd className="font-mono text-xl font-semibold text-warning">
                    {active.multiplier_vs_fleet_average}&times;
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Analyzed fleet</dt>
                  <dd className="font-mono text-xl font-semibold">{total_assets_analyzed}</dd>
                </div>
              </dl>
            </div>
            <p className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-foreground/80 text-pretty">
              {active.asset_id} fails {active.multiplier_vs_fleet_average}&times; more often than its
              peers. Prioritizing it for condition-based maintenance would cut the most reactive
              tickets per intervention.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
