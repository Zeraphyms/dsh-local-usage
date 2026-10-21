/**
 * The panel's report reads and the states they settle into.
 *
 * Three reads are kept apart on purpose: the year's window is the expensive one
 * and may open every log; the selected range is a re-price over the same folds
 * and must wait for the window; the day page is another re-price over one day.
 * Keeping the ordering here means `UsagePanel` composes pages rather than
 * coordinating four independent fetches.
 *
 * @module dsh-local-usage/client/useUsageReports
 */

import { useEffect, useRef, useState } from 'react'
import type { UsageInsightsProgress, UsageInsightsReport } from '../types.ts'
import { dayTime, nextDayStart } from './heatmap-grid.ts'
import {
  summaryFailed,
  summaryIdle,
  summarySettled,
  summarySlow,
  summaryStarted,
} from './summary-state.ts'
import type { SummaryState } from './summary-state.ts'

/** How long a range fold may run before the strip admits it is still going. */
const STALE_VISIBLE_MS = 180

/** One report fetch's state. */
export type ReportState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly report: UsageInsightsReport }

/** The day page's own fold, kept apart so a slow one never blanks the calendar. */
export type DayState = ReportState

/** One report request as the panel hands it to its Host. */
export interface ReportRequest {
  readonly from: number
  readonly to: number
  readonly refresh?: boolean
  readonly compare?: boolean
  readonly onProgress?: (progress: UsageInsightsProgress) => void
}

/** What the hook needs from the panel. */
export interface UseUsageReportsOptions {
  readonly active: boolean
  readonly report: (request: ReportRequest) => Promise<UsageInsightsReport>
  readonly gridFrom: number
  readonly gridTo: number
  readonly rangeFrom: number
  readonly rangeTo: number
  readonly rangeIsWindow: boolean
  readonly rangeKey: string
  readonly selectedDay: string | undefined
  readonly pricingRevision: number
}

/** The three reads and the controls that retry or recount them. */
export interface UsageReports {
  readonly gridState: ReportState
  readonly summaryState: SummaryState
  readonly dayState: DayState
  readonly progress: UsageInsightsProgress | undefined
  /** Ask for the year again, bypassing the Host's folds once. */
  readonly recount: () => void
  /** Retry the year without bypassing the folds. */
  readonly retryGrid: () => void
  /** Retry only the selected range's fold. */
  readonly retrySummary: () => void
  /** Retry only the day page's fold. */
  readonly retryDay: () => void
}

/**
 * Own the panel's three report reads and their pages' states.
 * @param options - the active panel, report reader, windows and retry revisions.
 * @returns the states and the retry/recount actions.
 */
export function useUsageReports({
  active, report, gridFrom, gridTo, rangeFrom, rangeTo, rangeIsWindow, rangeKey,
  selectedDay, pricingRevision,
}: UseUsageReportsOptions): UsageReports {
  const [request, setRequest] = useState(0)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const lastRefresh = useRef(0)
  const [gridState, setGridState] = useState<ReportState>({ status: 'idle' })
  const [summaryState, setSummaryState] = useState<SummaryState>({ status: 'idle' })
  const [summaryRequest, setSummaryRequest] = useState(0)
  const [dayState, setDayState] = useState<DayState>({ status: 'idle' })
  const [dayRequest, setDayRequest] = useState(0)
  const [progress, setProgress] = useState<UsageInsightsProgress | undefined>(undefined)

  // The calendar's window. This is the request that reads the logs, so it is the
  // only one that follows the window and the refresh counter — not the range.
  useEffect(() => {
    if (!active) return
    let current = true
    setGridState({ status: 'loading' })
    // One click, one bypass: compared against what this effect already spent,
    // so a later range change, rate write or reactivation does not ask the Host
    // to discard its folds again.
    const refresh = refreshNonce > lastRefresh.current
    lastRefresh.current = refreshNonce
    void report({
      refresh,
      from: gridFrom,
      to: gridTo,
      onProgress: (value) => { if (current) setProgress(value) },
    }).then(
      value => { if (current) setGridState({ status: 'ready', report: value }) },
      () => { if (current) setGridState({ status: 'error' }) },
    )
    return () => { current = false }
  }, [active, report, request, refreshNonce, pricingRevision, gridFrom, gridTo])

  // The selected range, folded over the same samples. It waits for the window to
  // settle rather than racing it: two requests in flight together would each see
  // an empty Host cache and each read every log.
  useEffect(() => {
    if (!active) {
      setSummaryState(previous => (previous.status === 'idle' ? previous : summaryIdle()))
      return
    }
    if (gridState.status === 'idle' || gridState.status === 'loading') return
    if (rangeIsWindow && gridState.status === 'ready') {
      setSummaryState(summarySettled(gridState.report, rangeKey))
      return
    }
    let current = true
    setSummaryState(summaryStarted)
    const slow = setTimeout(() => { if (current) setSummaryState(summarySlow) }, STALE_VISIBLE_MS)
    void report({ from: rangeFrom, to: rangeTo, compare: true }).then(
      value => { if (current) setSummaryState(summarySettled(value, rangeKey)) },
      () => { if (current) setSummaryState(summaryFailed()) },
    )
    return () => { current = false; clearTimeout(slow) }
  }, [active, report, rangeFrom, rangeTo, rangeIsWindow, summaryRequest, pricingRevision, gridState, rangeKey])

  // The day page's own fold. Cheap by construction: the samples behind it are
  // already in the Host's memory, so narrowing the window to one day re-prices
  // them instead of walking the logs again.
  useEffect(() => {
    if (!active || selectedDay === undefined) {
      setDayState(previous => (previous.status === 'idle' ? previous : { status: 'idle' }))
      return
    }
    const start = dayTime(selectedDay)
    if (start === undefined) {
      setDayState({ status: 'error' })
      return
    }
    let current = true
    setDayState({ status: 'loading' })
    void report({ from: start, to: nextDayStart(start) - 1 }).then(
      value => { if (current) setDayState({ status: 'ready', report: value }) },
      () => { if (current) setDayState({ status: 'error' }) },
    )
    return () => { current = false }
  }, [active, dayRequest, report, pricingRevision, selectedDay])

  return {
    gridState,
    summaryState,
    dayState,
    progress,
    recount: () => { setRefreshNonce(value => value + 1) },
    retryGrid: () => { setRequest(value => value + 1) },
    retrySummary: () => { setSummaryRequest(value => value + 1) },
    retryDay: () => { setDayRequest(value => value + 1) },
  }
}
