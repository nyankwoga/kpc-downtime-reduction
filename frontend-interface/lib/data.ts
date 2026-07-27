import raw from './dashboard-data.json'

export type Ticket = {
  run_timestamp: string
  work_order_id: string
  asset_id: string
  zone: string
  priority: 'high' | 'medium' | 'low'
  success: boolean
  latency_ms: number
  attempts: number
  ticket_id: string
  error: string
}

export type ChronicAsset = {
  asset_id: string
  zone: string
  asset_type: string
  ticket_count: number
  fleet_average: number
  multiplier_vs_fleet_average: number
}

export type DashboardData = {
  quality_report: {
    checks: Record<string, boolean>
    passed: number
    total: number
    pass_rate: number
    gate_status: string
    technician_double_bookings_found: number
  }
  insights: {
    chronic_assets_found: number
    chronic_assets: ChronicAsset[]
    total_assets_analyzed: number
    chronic_asset_rate: number
  }
  scheduler_run: {
    total_candidates: number
    succeeded: number
    failed: number
    retried: number
    avg_latency_ms: number
    priority_breakdown: Record<string, number>
    zone_breakdown: Record<string, number>
    tickets: Ticket[]
  }
  exported_at: string
}

export const data = raw as DashboardData

/** Human-readable labels for each data-quality expectation. */
export const CHECK_LABELS: Record<string, { label: string; detail: string }> = {
  no_null_asset_id: {
    label: 'No null asset IDs',
    detail: 'Every work order references a known asset',
  },
  no_null_reported_time: {
    label: 'No null report timestamps',
    detail: 'Every record has a valid reported time',
  },
  work_order_id_unique: {
    label: 'Work order IDs unique',
    detail: '15 duplicate rows removed during transform',
  },
  status_in_valid_set: {
    label: 'Status in valid set',
    detail: '17 raw variants collapsed to 4 canonical states',
  },
  zone_in_valid_set: {
    label: 'Zone in valid set',
    detail: 'Mombasa / Nairobi / Kisumu only',
  },
  downtime_non_negative: {
    label: 'Downtime hours non-negative',
    detail: 'No physically impossible negative durations',
  },
  downtime_within_bounds: {
    label: 'Downtime within bounds',
    detail: 'All durations at or below the 200h ceiling',
  },
  completed_time_after_reported: {
    label: 'Completion after report time',
    detail: '2 impossible timestamps corrected',
  },
  unknown_status_rate_below_5pct: {
    label: 'Unknown-status rate below 5%',
    detail: 'Ambiguous statuses flagged, not dropped',
  },
  technician_double_booking_rate_below_2pct: {
    label: 'Technician double-booking below 2%',
    detail: 'Overlapping job windows per technician',
  },
}

/** Pipeline stage story — sourced from the ETL run summary. */
export const PIPELINE_STAGES = [
  { key: 'extract', label: 'Extract', value: '615', unit: 'raw rows', note: 'Messy CMMS export' },
  { key: 'transform', label: 'Transform', value: '600', unit: 'clean rows', note: '15 dupes · 2 fixes' },
  { key: 'gate', label: 'Quality gate', value: '10/10', unit: 'checks pass', note: 'CI-enforced' },
  { key: 'load', label: 'Load', value: '24', unit: 'assets · 3 zones', note: 'Idempotent SQLite' },
  { key: 'schedule', label: 'Scheduler', value: '264', unit: 'tickets raised', note: '100% success' },
] as const

export const ZONE_COLORS: Record<string, string> = {
  Nairobi: 'var(--chart-1)',
  Kisumu: 'var(--chart-2)',
  Mombasa: 'var(--chart-3)',
}

export const PRIORITY_COLORS: Record<string, string> = {
  high: 'var(--chart-4)',
  medium: 'var(--chart-3)',
  low: 'var(--chart-2)',
}
