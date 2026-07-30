'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api, type MaintenanceRow } from '@/lib/api'
import { useDashboard } from '@/lib/engine'
import { Search, Filter, RefreshCw, FileText, Droplets, Gauge } from 'lucide-react'

export function WorkOrdersTable() {
  const { fleetOverview, pipelinePhase } = useDashboard()
  const [workOrders, setWorkOrders] = useState<MaintenanceRow[]>([])
  const [totalMatching, setTotalMatching] = useState(0)
  const [loading, setLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [zone, setZone] = useState('all')
  const [assetType, setAssetType] = useState('all')

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.maintenance({
        status: status === 'all' ? undefined : status,
        zone: zone === 'all' ? undefined : zone,
        search: search.trim() || undefined,
        limit: 300,
      })
      let rows = res.work_orders
      if (assetType !== 'all') {
        rows = rows.filter((r) => r.asset_type?.toLowerCase() === assetType.toLowerCase())
      }
      setWorkOrders(rows)
      setTotalMatching(rows.length)
    } catch {
      setWorkOrders([])
      setTotalMatching(0)
    } finally {
      setLoading(false)
    }
  }, [status, zone, search, assetType])

  useEffect(() => {
    fetchWorkOrders()
  }, [fetchWorkOrders, pipelinePhase])

  if (!fleetOverview && workOrders.length === 0 && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            Work Orders Explorer
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            No maintenance records loaded yet, click &ldquo;Run pipeline now&rdquo; above to fetch live data.
          </p>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              Work Orders &amp; Maintenance Explorer
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Inspect cleaned maintenance records, filter by equipment ID, zone, status, or search technician notes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {totalMatching} records match
            </Badge>
            <button
              type="button"
              onClick={fetchWorkOrders}
              className="inline-flex size-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted transition-colors"
              title="Refresh table"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search WO#, Asset, Tech, Notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground shrink-0" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Zones</option>
              <option value="Mombasa">Mombasa</option>
              <option value="Nairobi">Nairobi</option>
              <option value="Kisumu">Kisumu</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Asset Types</option>
              <option value="Valve">Valves</option>
              <option value="Pump">Pumps</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 text-xs">
                <TableHead className="w-[110px] font-semibold">Work Order</TableHead>
                <TableHead className="w-[120px] font-semibold">Asset ID</TableHead>
                <TableHead className="w-[100px] font-semibold">Zone</TableHead>
                <TableHead className="w-[140px] font-semibold">Reported Time</TableHead>
                <TableHead className="w-[110px] font-semibold">Status</TableHead>
                <TableHead className="w-[130px] font-semibold">Technician</TableHead>
                <TableHead className="w-[100px] text-right font-semibold">Downtime</TableHead>
                <TableHead className="font-semibold">Notes / Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                    {loading ? 'Loading work orders...' : 'No work orders match the selected filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                workOrders.map((row) => {
                  const isValve = row.asset_type === 'Valve'
                  const Icon = isValve ? Gauge : Droplets

                  let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline'
                  let badgeClass = ''
                  if (row.status === 'Completed') {
                    badgeClass = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  } else if (row.status === 'Overdue') {
                    badgeVariant = 'destructive'
                  } else if (row.status === 'In Progress') {
                    badgeClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                  } else if (row.status === 'Open') {
                    badgeClass = 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                  }

                  return (
                    <TableRow key={row.work_order_id} className="text-xs hover:bg-muted/50">
                      <TableCell className="font-mono font-medium">{row.work_order_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono font-semibold">
                          <Icon className="size-3.5 text-primary shrink-0" />
                          {row.asset_id}
                        </div>
                      </TableCell>
                      <TableCell>{row.zone}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {row.reported_time ?? 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant} className={`text-[11px] px-2 py-0.5 ${badgeClass}`}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={row.technician === 'Unassigned' ? 'text-muted-foreground italic' : ''}>
                        {row.technician}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {row.downtime_hours != null ? `${row.downtime_hours.toFixed(1)} hrs` : '-'}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate text-muted-foreground text-[11px]" title={row.notes ?? ''}>
                        {row.notes ?? '-'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
