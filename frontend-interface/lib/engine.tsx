'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  api,
  ApiError,
  type ChronicAsset,
  type EquipmentRow,
  type FleetOverview,
  type Insights,
  type NotificationRow,
  type QualityReport,
  type TechnicianRow,
  type Ticket,
} from './api'

/**
 * lib/engine.tsx
 * ---------------
 * Client-side state that drives the dashboard from the REAL backend
 * (app.py). Clicking "Run pipeline" / "Run scheduler" makes an actual
 * POST request; every number on screen traces back to that response,
 * not a bundled JSON snapshot.
 */

export type Phase = 'idle' | 'running' | 'done' | 'error'

export type { ChronicAsset, EquipmentRow, FleetOverview, Insights, NotificationRow, QualityReport, TechnicianRow, Ticket }

type EngineValue = {
  // Pipeline
  pipelinePhase: Phase
  pipelineError: string | null
  qualityReport: QualityReport | null
  insights: Insights | null
  fleetOverview: FleetOverview | null
  rowsCleaned: number | null
  runPipeline: () => void

  // Scheduler
  schedulerPhase: Phase
  schedulerError: string | null
  tickets: Ticket[]
  totalCandidates: number
  succeeded: number
  failed: number
  avgLatencyMs: number
  runScheduler: () => void

  // Fleet views (equipment / technicians / notifications)
  equipment: EquipmentRow[]
  technicians: TechnicianRow[]
  notifications: NotificationRow[]
  unassignedWorkOrders: number

  lastRun: number | null
  busy: boolean
  hydrating: boolean
}

const EngineContext = createContext<EngineValue | null>(null)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [pipelinePhase, setPipelinePhase] = useState<Phase>('idle')
  const [pipelineError, setPipelineError] = useState<string | null>(null)
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [fleetOverview, setFleetOverview] = useState<FleetOverview | null>(null)
  const [rowsCleaned, setRowsCleaned] = useState<number | null>(null)

  const [schedulerPhase, setSchedulerPhase] = useState<Phase>('idle')
  const [schedulerError, setSchedulerError] = useState<string | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [totalCandidates, setTotalCandidates] = useState(0)
  const [succeeded, setSucceeded] = useState(0)
  const [failed, setFailed] = useState(0)
  const [avgLatencyMs, setAvgLatencyMs] = useState(0)

  const [equipment, setEquipment] = useState<EquipmentRow[]>([])
  const [technicians, setTechnicians] = useState<TechnicianRow[]>([])
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [unassignedWorkOrders, setUnassignedWorkOrders] = useState(0)

  const [lastRun, setLastRun] = useState<number | null>(null)
  const [hydrating, setHydrating] = useState(true)

  const refreshFleetData = useCallback(() => {
    api
      .equipment()
      .then((r) => setEquipment(r.equipment))
      .catch(() => {})
    api
      .technicians()
      .then((r) => {
        setTechnicians(r.technicians)
        setUnassignedWorkOrders(r.unassigned_work_orders)
      })
      .catch(() => {})
    api
      .notifications()
      .then((r) => setNotifications(r.notifications))
      .catch(() => {})
  }, [])

  // On mount, pull whatever state the backend already has — e.g. someone
  // already clicked "Run pipeline" from another tab, or the server never
  // restarted. This avoids showing a fake "idle" state for a backend that's
  // actually already primed.
  useEffect(() => {
    let cancelled = false

    api
      .pipelineStatus()
      .then((status) => {
        if (cancelled || !status.quality_report) return
        setQualityReport(status.quality_report)
        setInsights(status.insights)
        setFleetOverview(status.fleet_overview)
        setPipelinePhase('done')
        refreshFleetData()
      })
      .catch(() => {})

    api
      .schedulerLatest()
      .then((r) => {
        if (cancelled || !r.tickets?.length) return
        setTickets(r.tickets)
        setTotalCandidates(r.tickets.length)
        setSucceeded(r.tickets.filter((t) => t.success).length)
        setFailed(r.tickets.filter((t) => !t.success).length)
        const avg = r.tickets.reduce((s, t) => s + t.latency_ms, 0) / r.tickets.length
        setAvgLatencyMs(Math.round(avg * 10) / 10)
        setSchedulerPhase('done')
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHydrating(false)
      })

    return () => {
      cancelled = true
    }
  }, [refreshFleetData])

  const runPipeline = useCallback(() => {
    setPipelinePhase('running')
    setPipelineError(null)
    api
      .runPipeline()
      .then((res) => {
        setQualityReport(res.quality_report)
        setInsights(res.insights)
        setFleetOverview(res.fleet_overview)
        setRowsCleaned(res.rows_cleaned)
        setPipelinePhase('done')
        setLastRun(Date.now())
        refreshFleetData()
      })
      .catch((err: unknown) => {
        setPipelineError(err instanceof ApiError ? err.message : 'Pipeline run failed')
        setPipelinePhase('error')
      })
  }, [refreshFleetData])

  const runScheduler = useCallback(() => {
    setSchedulerPhase('running')
    setSchedulerError(null)
    api
      .runScheduler()
      .then((res) => {
        setTickets(res.tickets)
        setTotalCandidates(res.total_candidates)
        setSucceeded(res.succeeded)
        setFailed(res.failed)
        setAvgLatencyMs(res.avg_latency_ms)
        setSchedulerPhase('done')
        setLastRun(Date.now())
        refreshFleetData()
      })
      .catch((err: unknown) => {
        setSchedulerError(err instanceof ApiError ? err.message : 'Scheduler run failed')
        setSchedulerPhase('error')
      })
  }, [refreshFleetData])

  const value = useMemo<EngineValue>(
    () => ({
      pipelinePhase,
      pipelineError,
      qualityReport,
      insights,
      fleetOverview,
      rowsCleaned,
      runPipeline,
      schedulerPhase,
      schedulerError,
      tickets,
      totalCandidates,
      succeeded,
      failed,
      avgLatencyMs,
      runScheduler,
      equipment,
      technicians,
      notifications,
      unassignedWorkOrders,
      lastRun,
      busy: pipelinePhase === 'running' || schedulerPhase === 'running',
      hydrating,
    }),
    [
      pipelinePhase,
      pipelineError,
      qualityReport,
      insights,
      fleetOverview,
      rowsCleaned,
      runPipeline,
      schedulerPhase,
      schedulerError,
      tickets,
      totalCandidates,
      succeeded,
      failed,
      avgLatencyMs,
      runScheduler,
      equipment,
      technicians,
      notifications,
      unassignedWorkOrders,
      lastRun,
      hydrating,
    ],
  )

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>
}

export function useDashboard() {
  const ctx = useContext(EngineContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
