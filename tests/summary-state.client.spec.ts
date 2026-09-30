/**
 * The summary strip's transitions.
 *
 * The bug these exist for: switching the range discarded the figures, so the
 * page's tallest block collapsed to a line and everything below it jumped — for
 * a round trip the reader would never otherwise have noticed. So the invariant
 * worth pinning is that a fold *never* takes the figures away once there are any,
 * and that the figures never end up wearing a range they were not folded for.
 *
 * @module dsh-local-usage/tests/summary-state
 */

import { describe, expect, it } from 'vitest'
import {
  summaryFailed,
  summaryIdle,
  summarySettled,
  summarySlow,
  summaryStarted,
} from '../src/client/summary-state.ts'
import type { SummaryState } from '../src/client/summary-state.ts'
import type { UsageInsightsReport } from '../src/types.ts'

/** The least a report can be and still stand for one in these transitions. */
function report(cost: number): UsageInsightsReport {
  return { totals: { cost } } as unknown as UsageInsightsReport
}

/** A strip already showing one range's figures. */
function showing(rangeId = 'day'): SummaryState {
  return summarySettled(report(1), rangeId)
}

describe('summaryStarted', () => {
  it('keeps the figures that are already up, marked as not yet replaced', () => {
    const next = summaryStarted(showing())
    expect(next.status).toBe('ready')
    expect(next).toMatchObject({ pending: true, slow: false })
  })

  it('keeps naming the range those figures were folded for', () => {
    // The selection has moved to another range; the report has not.
    expect(summaryStarted(showing('day'))).toMatchObject({ rangeId: 'day', pending: true })
  })

  it('shows the loading frame when there is nothing to keep', () => {
    expect(summaryStarted(summaryIdle())).toEqual({ status: 'loading' })
  })

  it('shows the loading frame when the last fold failed', () => {
    expect(summaryStarted(summaryFailed())).toEqual({ status: 'loading' })
  })

  it('does not carry a slow admission into the next fold', () => {
    const slow = summarySlow(summaryStarted(showing()))
    expect(slow).toMatchObject({ slow: true })
    expect(summaryStarted(slow)).toMatchObject({ slow: false, pending: true })
  })
})

describe('summarySlow', () => {
  it('admits to a wait only while one is running', () => {
    expect(summarySlow(summaryStarted(showing()))).toMatchObject({ slow: true })
    expect(summarySlow(showing())).toMatchObject({ slow: false })
    expect(summarySlow(summaryIdle())).toEqual({ status: 'idle' })
  })
})

describe('summarySettled', () => {
  it('replaces the figures and drops every trace of the wait', () => {
    const next = summarySettled(report(9), 'month')
    expect(next).toEqual({
      status: 'ready',
      report: report(9),
      rangeId: 'month',
      pending: false,
      slow: false,
    })
  })
})

describe('summaryFailed', () => {
  it('drops figures that would otherwise wear the wrong range', () => {
    // The one transition that does empty the strip: the selection has moved, the
    // fold did not land, and a number with no label to contradict it is worse than
    // no number at all.
    expect(summaryFailed()).toEqual({ status: 'error' })
  })
})
