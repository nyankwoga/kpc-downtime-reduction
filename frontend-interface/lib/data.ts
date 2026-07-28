/**
 * lib/data.ts
 * ------------
 * Presentation-only constants: human-readable labels and chart colors.
 * All actual numbers now come live from the backend via lib/api.ts +
 * lib/engine.tsx — nothing here is a data snapshot anymore.
 */

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
    detail: 'Duplicate rows removed during transform',
  },
  status_in_valid_set: {
    label: 'Status in valid set',
    detail: 'Raw status variants collapsed to canonical states',
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
    detail: 'Impossible timestamps corrected',
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
