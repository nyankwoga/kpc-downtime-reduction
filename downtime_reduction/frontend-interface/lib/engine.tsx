'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { TOTAL_TICKETS } from './fleet'

/**
 * Client-side "engine" that mirrors app.py's live behaviour:
 *   - Run pipeline  -> extract -> transform -> quality gate -> load
 *   - Run scheduler -> streams auto-created tickets with latency + retries
 * The buttons drive real animated state that every view reads from, so the
 * dashboard behaves like the deployed FastAPI app, not a static snapshot.
 */

export const PIPELINE_STEPS = [
  { key: 'extract', label: 'Extract raw work orders', detail: 'Reading CMMS export · 615 rows' },
  { key: 'transform', label: 'Clean & normalize', detail: 'Dates, statuses, dedupe · 600 rows' },
  { key: 'gate', label: 'Data-quality gate', detail: '10 expectations · CI-enforced' },
  { key: 'load', label: 'Load to warehouse', detail: 'Idempotent SQLite · 24 assets' },
] as const

type Phase = 'idle' | 'running' | 'done'

type EngineValue = {
  pipelinePhase: Phase
  pipelineStep: number // active step index while running; 4 when done
  pipelineDone: boolean
  runPipeline: () => void

  schedulerPhase: Phase
  schedulerCount: number
  schedulerDone: boolean
  runScheduler: () => void

  reset: () => void
  lastRun: number | null
  busy: boolean
}

const EngineContext = createContext<EngineValue | null>(null)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  // Start in the "completed run" state so the console is populated on load.
  const [pipelinePhase, setPipelinePhase] = useState<Phase>('done')
  const [pipelineStep, setPipelineStep] = useState(4)
  const [schedulerPhase, setSchedulerPhase] = useState<Phase>('done')
  const [schedulerCount, setSchedulerCount] = useState(TOTAL_TICKETS)
  const [lastRun, setLastRun] = useState<number | null>(() => Date.now())

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    if (interval.current) {
      clearInterval(interval.current)
      interval.current = null
    }
  }, [])

  useEffect(() => () => clearAll(), [clearAll])

  const runPipeline = useCallback(() => {
    clearAll()
    setPipelinePhase('running')
    setPipelineStep(0)
    PIPELINE_STEPS.forEach((_, i) => {
      timers.current.push(
        setTimeout(() => {
          setPipelineStep(i)
          if (i === PIPELINE_STEPS.length - 1) {
            timers.current.push(
              setTimeout(() => {
                setPipelineStep(4)
                setPipelinePhase('done')
                setLastRun(Date.now())
              }, 650),
            )
          }
        }, i * 700),
      )
    })
  }, [clearAll])

  const runScheduler = useCallback(() => {
    clearAll()
    setSchedulerPhase('running')
    setSchedulerCount(0)
    const durationMs = 3600
    const tickMs = 40
    const step = Math.max(1, Math.ceil(TOTAL_TICKETS / (durationMs / tickMs)))
    interval.current = setInterval(() => {
      setSchedulerCount((c) => {
        const next = Math.min(c + step, TOTAL_TICKETS)
        if (next >= TOTAL_TICKETS) {
          if (interval.current) clearInterval(interval.current)
          interval.current = null
          setSchedulerPhase('done')
          setLastRun(Date.now())
        }
        return next
      })
    }, tickMs)
  }, [clearAll])

  const reset = useCallback(() => {
    clearAll()
    setPipelinePhase('idle')
    setPipelineStep(-1)
    setSchedulerPhase('idle')
    setSchedulerCount(0)
    setLastRun(null)
  }, [clearAll])

  const value = useMemo<EngineValue>(
    () => ({
      pipelinePhase,
      pipelineStep,
      pipelineDone: pipelinePhase === 'done',
      runPipeline,
      schedulerPhase,
      schedulerCount,
      schedulerDone: schedulerPhase === 'done',
      runScheduler,
      reset,
      lastRun,
      busy: pipelinePhase === 'running' || schedulerPhase === 'running',
    }),
    [
      pipelinePhase,
      pipelineStep,
      schedulerPhase,
      schedulerCount,
      runPipeline,
      runScheduler,
      reset,
      lastRun,
    ],
  )

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>
}

export function useDashboard() {
  const ctx = useContext(EngineContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
