/**
 * The range's wave, bucketed to fit its window.
 *
 * The rule pinned here is the one a reader notices when it is wrong: a day is
 * read in hours, a week and a month in days, a quarter in weeks and a year in
 * months. Drawing 365 points for a year, or 24 for one, are the same mistake in
 * opposite directions.
 */

import { describe, expect, it } from 'vitest'
import { wavePlot, waveSeries } from '../src/client/wave.ts'
import type { UsageDayRow, UsageHourRow } from '../src/types.ts'

/** One day row carrying a cost, dated so its month and weekday are known. */
function day(day: string, cost: number): UsageDayRow {
  return {
    day, cost, calls: 1, sessions: 1,
    uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
  }
}

/** One hour row carrying a cost. */
function hour(hourOfDay: number, cost: number): UsageHourRow {
  return { hour: hourOfDay, cost, calls: 1, tokens: 0 }
}

const HOURS = Array.from({ length: 24 }, (_, index) => hour(index, index === 10 ? 5 : 0))

describe('waveSeries', () => {
  it('reads a single day in hours', () => {
    const points = waveSeries({ days: [], hourly: HOURS, routeSeries: [], range: 'day' }, false)

    expect(points).toHaveLength(24)
    expect(points[0]?.label).toBe('00')
    expect(points[10]).toEqual({ label: '10', cost: 5 })
  })

  it('reads a week and a month in days', () => {
    const days = [day('2026-09-21', 1), day('2026-09-22', 2)]

    expect(waveSeries({ days, hourly: [], routeSeries: [], range: 'week' }, false).map(p => p.label))
      .toEqual(['09-21', '09-22'])
    expect(waveSeries({ days, hourly: [], routeSeries: [], range: 'month' }, false)).toHaveLength(2)
  })

  it('folds a quarter into the weeks its days belong to', () => {
    // 2026-09-21 is a Monday, so the 21st to the 27th is one working week and the
    // 28th opens the next.
    const points = waveSeries({
      days: [day('2026-09-21', 1), day('2026-09-23', 2), day('2026-09-28', 4)],
      hourly: [], routeSeries: [],
      range: 'quarter',
    }, false)

    expect(points).toHaveLength(2)
    expect(points[0]).toEqual({ label: '09-21', cost: 3 })
    expect(points[1]).toEqual({ label: '09-28', cost: 4 })
  })

  it('folds a year into months, in order, named for the locale', () => {
    const days = [day('2026-11-02', 3), day('2026-01-05', 1), day('2026-01-06', 2)]

    const zh = waveSeries({ days, hourly: [], routeSeries: [], range: 'year' }, true)
    expect(zh).toEqual([{ label: '1月', cost: 3 }, { label: '11月', cost: 3 }])
    expect(waveSeries({ days, hourly: [], routeSeries: [], range: 'year' }, false)[0]?.label).toBe('1')
  })

  it('answers nothing for a window that recorded nothing', () => {
    expect(waveSeries({ days: [], hourly: [], routeSeries: [], range: 'year' }, false)).toEqual([])
    expect(waveSeries({ days: [], hourly: [], routeSeries: [], range: 'day' }, false)).toEqual([])
  })
})

describe('wavePlot', () => {
  it('lays points across the unit square, oldest first', () => {
    const plot = wavePlot([{ label: 'a', cost: 0 }, { label: 'b', cost: 10 }])

    expect(plot).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }])
  })

  it('scales to the largest point rather than to an absolute scale', () => {
    const plot = wavePlot([{ label: 'a', cost: 5 }, { label: 'b', cost: 10 }])

    expect(plot[0]?.y).toBe(0.5)
    expect(plot[1]?.y).toBe(1)
  })

  it('draws a flat window flat, not as a crest at the top', () => {
    const plot = wavePlot([{ label: 'a', cost: 0 }, { label: 'b', cost: 0 }])

    expect(plot.every(point => point.y === 0)).toBe(true)
  })

  it('places a single point at the start of its own square', () => {
    expect(wavePlot([{ label: 'only', cost: 3 }])).toEqual([{ x: 0, y: 1 }])
  })

  it('answers nothing for no points', () => {
    expect(wavePlot([])).toEqual([])
  })
})
