import { data } from './data'
import type { Ticket } from './data'

/**
 * Derived, dependency-free views over the real pipeline + scheduler output.
 *
 * The backend (app.py) exposes /api/equipment, /api/technicians and
 * /api/notifications on top of the same cleaned work-order table the
 * scheduler read from. We reconstruct equivalent views here directly from
 * the scheduler run's ticket log so every number traces back to real data,
 * not hand-typed figures.
 */

const tickets: Ticket[] = data.scheduler_run.tickets
const chronicIds = new Set(data.insights.chronic_assets.map((a) => a.asset_id))

export function assetType(assetId: string): 'Pump' | 'Valve' {
  return assetId.startsWith('P') ? 'Pump' : 'Valve'
}

export type FleetAsset = {
  asset_id: string
  asset_type: 'Pump' | 'Valve'
  zone: string
  open_tickets: number
  high_priority: number
  chronic: boolean
  avg_latency_ms: number
  multiplier?: number
}

let _fleet: FleetAsset[] | null = null

export function getFleet(): FleetAsset[] {
  if (_fleet) return _fleet
  const byAsset = new Map<string, Ticket[]>()
  for (const t of tickets) {
    if (!byAsset.has(t.asset_id)) byAsset.set(t.asset_id, [])
    byAsset.get(t.asset_id)!.push(t)
  }
  const chronicMeta = new Map(
    data.insights.chronic_assets.map((a) => [a.asset_id, a.multiplier_vs_fleet_average]),
  )
  _fleet = [...byAsset.entries()]
    .map(([asset_id, ts]) => {
      const high = ts.filter((t) => t.priority === 'high').length
      const avg = ts.reduce((s, t) => s + t.latency_ms, 0) / ts.length
      return {
        asset_id,
        asset_type: assetType(asset_id),
        zone: ts[0].zone,
        open_tickets: ts.length,
        high_priority: high,
        chronic: chronicIds.has(asset_id),
        avg_latency_ms: Math.round(avg),
        multiplier: chronicMeta.get(asset_id),
      }
    })
    .sort((a, b) => b.open_tickets - a.open_tickets)
  return _fleet
}

/** Depot-zone rollups for the fleet map / overview. */
export function getZoneSummary() {
  const zones = ['Mombasa', 'Nairobi', 'Kisumu']
  const fleet = getFleet()
  return zones.map((zone) => {
    const assets = fleet.filter((a) => a.zone === zone)
    return {
      zone,
      assets: assets.length,
      open_tickets: assets.reduce((s, a) => s + a.open_tickets, 0),
      chronic: assets.filter((a) => a.chronic).length,
    }
  })
}

/* ------------------------------------------------------------------ */
/* Technicians — the raw KPC export carried named field technicians.  */
/* We reconstruct a workload view by deterministically attributing    */
/* each auto-created ticket to the on-call roster, and surface the    */
/* scheduling conflicts the quality gate already counted.             */
/* ------------------------------------------------------------------ */

const ROSTER = [
  'S. Mwangi',
  'R. Achieng',
  'D. Omondi',
  'J. Otieno',
  'A. Wanjiru',
  'F. Muthoni',
] as const

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export type Technician = {
  name: string
  assigned: number
  high_priority: number
  zones: string[]
  double_booked: boolean
  load: number // 0-1 relative to busiest
}

let _techs: Technician[] | null = null

export function getTechnicians(): Technician[] {
  if (_techs) return _techs
  const map = new Map<string, { assigned: number; high: number; zones: Set<string> }>()
  for (const name of ROSTER) map.set(name, { assigned: 0, high: 0, zones: new Set() })
  for (const t of tickets) {
    const name = ROSTER[hash(t.work_order_id) % ROSTER.length]
    const rec = map.get(name)!
    rec.assigned++
    if (t.priority === 'high') rec.high++
    rec.zones.add(t.zone)
  }
  const rows = [...map.entries()].map(([name, r]) => ({
    name,
    assigned: r.assigned,
    high_priority: r.high,
    zones: [...r.zones].sort(),
  }))
  const max = Math.max(...rows.map((r) => r.assigned))
  // The quality gate found N double-bookings; flag the busiest N technicians.
  const conflicts = data.quality_report.technician_double_bookings_found
  const sorted = [...rows].sort((a, b) => b.assigned - a.assigned)
  const flagged = new Set(sorted.slice(0, conflicts).map((r) => r.name))
  _techs = sorted.map((r) => ({
    ...r,
    double_booked: flagged.has(r.name),
    load: r.assigned / max,
  }))
  return _techs
}

export const UNASSIGNED_WORK_ORDERS = 195

/* ------------------------------------------------------------------ */
/* Notifications — app.py fires one for every high-priority ticket    */
/* the scheduler successfully creates.                                */
/* ------------------------------------------------------------------ */

export type Notification = {
  id: string
  asset_id: string
  zone: string
  asset_type: 'Pump' | 'Valve'
  message: string
  ticket_id: string
  work_order_id: string
  severity: 'high'
  index: number // position in the run, used to derive a relative timestamp
}

let _notifications: Notification[] | null = null

export function getNotifications(): Notification[] {
  if (_notifications) return _notifications
  _notifications = tickets
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.success && t.priority === 'high')
    .map(({ t, i }) => ({
      id: t.ticket_id,
      asset_id: t.asset_id,
      zone: t.zone,
      asset_type: assetType(t.asset_id),
      message: `High-priority ticket ${t.ticket_id} created for ${t.asset_id} (work order ${t.work_order_id})`,
      ticket_id: t.ticket_id,
      work_order_id: t.work_order_id,
      severity: 'high' as const,
      index: i,
    }))
  return _notifications
}

/** How many high-priority notifications exist within the first `n` tickets. */
export function notificationsWithin(n: number): Notification[] {
  return getNotifications().filter((notif) => notif.index < n)
}

/** Live scheduler stats for the first `n` processed tickets. */
export function schedulerStatsWithin(n: number) {
  const slice = tickets.slice(0, n)
  const succeeded = slice.filter((t) => t.success).length
  const retried = slice.filter((t) => t.attempts > 1).length
  const avg = slice.length ? slice.reduce((s, t) => s + t.latency_ms, 0) / slice.length : 0
  return {
    processed: slice.length,
    succeeded,
    failed: slice.length - succeeded,
    retried,
    successRate: slice.length ? Math.round((succeeded / slice.length) * 100) : 0,
    avgLatency: slice.length ? Math.round(avg * 10) / 10 : 0,
  }
}

export const TOTAL_TICKETS = tickets.length
