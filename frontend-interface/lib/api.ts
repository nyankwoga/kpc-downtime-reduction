/**
 * lib/api.ts
 * -----------
 * Thin typed client for the FastAPI backend (app.py). Every function here
 * hits a real endpoint over HTTP — nothing in this file is mock/static data.
 *
 * Base URL comes from NEXT_PUBLIC_API_URL (set it in .env.local). Falls back
 * to the backend's local dev default (`uvicorn app:app --port 8000`).
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError(
      `Could not reach the backend at ${API_BASE}. Is it running (uvicorn app:app --port 8000)?`,
      0,
    )
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      if (body?.detail) detail = body.detail
    } catch {
      // response wasn't JSON — keep statusText
    }
    throw new ApiError(detail, res.status)
  }
  return (await res.json()) as T
}

/* ------------------------------------------------------------------ */
/* Shared types — mirror the Pydantic/dict shapes app.py returns      */
/* ------------------------------------------------------------------ */

export type QualityReport = {
  checks: Record<string, boolean>
  passed: number
  total: number
  pass_rate: number
  gate_status: 'PASS' | 'FAIL'
  technician_double_bookings_found: number
}

export type ChronicAsset = {
  asset_id: string
  zone: string
  asset_type: string
  ticket_count: number
  fleet_average: number
  multiplier_vs_fleet_average: number
}

export type Insights = {
  chronic_assets_found: number
  chronic_assets: ChronicAsset[]
  total_assets_analyzed: number
  chronic_asset_rate: number
}

export type FleetOverview = {
  total_assets: number
  total_work_orders: number
  assets_by_type: Record<string, number>
  assets_by_zone: Record<string, number>
  work_orders_by_status: Record<string, number>
  open_or_overdue_count: number
  unassigned_technician_count: number
}

export type PipelineRunResult = {
  quality_report: QualityReport
  insights: Insights
  fleet_overview: FleetOverview
  rows_cleaned: number
}

export type PipelineStatus = {
  quality_report: QualityReport | null
  insights: Insights | null
  fleet_overview: FleetOverview | null
}

export type Ticket = {
  run_timestamp: string
  work_order_id: string
  asset_id: string
  zone: string
  priority: 'high' | 'medium' | 'low'
  success: boolean
  latency_ms: number
  attempts: number
  ticket_id: string | null
  error: string | null
}

export type SchedulerRunResult = {
  total_candidates: number
  succeeded: number
  failed: number
  avg_latency_ms: number
  tickets: Ticket[]
}

export type EquipmentRow = {
  asset_id: string
  asset_type: string
  zone: string
  total_work_orders: number
  open_or_overdue: number
}

export type EquipmentResponse = { total: number; equipment: EquipmentRow[] }

export type TechnicianRow = {
  technician: string
  assigned_work_orders: number
  zones: string[]
  open_or_overdue: number
}

export type TechniciansResponse = {
  total_technicians: number
  unassigned_work_orders: number
  technicians: TechnicianRow[]
}

export type NotificationRow = {
  asset_id: string
  zone: string
  message: string
  severity: string
  sent_at: string
}

export type NotificationsResponse = { total: number; notifications: NotificationRow[] }

export type MaintenanceRow = {
  work_order_id: string
  asset_id: string
  zone: string
  status: string
  technician: string
  downtime_hours: number | null
  sla_hours: number | null
}

export type MaintenanceResponse = {
  total_matching: number
  returned: number
  work_orders: MaintenanceRow[]
}

/* ------------------------------------------------------------------ */
/* API surface                                                        */
/* ------------------------------------------------------------------ */

export const api = {
  health: () => request<{ status: string; ticket_count: number }>('/api/health'),

  runPipeline: () => request<PipelineRunResult>('/api/pipeline/run', { method: 'POST' }),
  pipelineStatus: () => request<PipelineStatus>('/api/pipeline/status'),

  runScheduler: () => request<SchedulerRunResult>('/api/scheduler/run', { method: 'POST' }),
  schedulerLatest: () => request<{ tickets: Ticket[] }>('/api/scheduler/latest'),

  equipment: () => request<EquipmentResponse>('/api/equipment'),
  technicians: () => request<TechniciansResponse>('/api/technicians'),
  notifications: () => request<NotificationsResponse>('/api/notifications'),
  maintenance: (params?: { status?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.limit) qs.set('limit', String(params.limit))
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return request<MaintenanceResponse>(`/api/maintenance${suffix}`)
  },

  tickets: () => request<{ ticket_id: string; asset_id: string; zone: string; priority: string; reason: string; status: string; created_at: string }[]>(
    '/api/tickets',
  ),
}
