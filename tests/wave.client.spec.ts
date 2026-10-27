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
import type { UsageDayRow, UsageDaySlice } from '../src/types.ts'

/** One day row carrying a cost, dated so its month and weekday are known. */
function day(day: string, cost: number): UsageDayRow {
  return {
    day, cost, calls: 1, sessions: 1,
    uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
  }
}

/** One ten-minute slice of the day carrying a cost. */
function slice(minutes: number, cost: number): UsageDaySlice {
  return { minutes, cost, calls: 1, tokens: 0 }
}

/** A whole day, quiet except for ten o'clock. */
const SLICES = Array.from({ length: 144 }, (_, index) => slice(index * 10, index === 60 ? 5 : 0))

describe('waveSeries', () => {
  it('reads a single day in ten-minute slices, labelled as clock times', () => {
    const points = waveSeries({ days: [], slices: SLICES, range: 'day' }, false)

    expect(points).toHaveLength(144)
    expect(points[0]?.label).toBe('00:00')
    // The tenth hour of the day is its sixtieth slice.
    expect(points[60]).toEqual({ label: '10:00', cost: 5 })
    expect(points[61]).toEqual({ label: '10:10', cost: 0 })
  })

  it('reads a week and a month in days', () => {
    const days = [day('2026-09-21', 1), day('2026-09-22', 2)]

    expect(waveSeries({ days, slices: [], range: 'week' }, false).map(p => p.label))
      .toEqual(['09-21', '09-22'])
    expect(waveSeries({ days, slices: [], range: 'month' }, false)).toHaveLength(2)
  })

  it('reads twenty-four hours in clock points, thinned to the hour marks', () => {
    // The window spans two calendar days, so the report's slices fold both days'
    // samples by Beijing clock time; the same buckets serve, thinned.
    const points = waveSeries({ days: [], slices: SLICES, range: 'h24' }, false)

    // Every sixth slice kept, plus the final one.
    expect(points.length).toBeLessThanOrEqual(25)
    expect(points[0]?.label).toBe('00:00')
    expect(points[1]?.label).toBe('01:00')
    // The tenth hour of the day is its sixtieth slice, kept (60 % 6 === 0).
    expect(points.find(p => p.label === '10:00')).toEqual({ label: '10:00', cost: 5 })
  })

  it('reads all time in month buckets drawn only where days exist', () => {
    const days = [day('2025-10-05', 2), day('2026-01-05', 1), day('2026-10-05', 3)]
    const points = waveSeries({ days, slices: [], range: 'all' }, true)

    // No from/to is passed: the span is open-ended, so only recorded months draw.
    // The span crosses years, so every label carries its own.
    expect(points).toEqual([
      { label: '2025-10', cost: 2 },
      { label: '2026-01', cost: 1 },
      { label: '2026-10', cost: 3 },
    ])
  })

  it('folds a quarter into the weeks its days belong to', () => {
    // 2026-09-21 is a Monday, so the 21st to the 27th is one working week and the
    // 28th opens the next.
    const points = waveSeries({
      days: [day('2026-09-21', 1), day('2026-09-23', 2), day('2026-09-28', 4)],
      slices: [],
      range: 'quarter',
    }, false)

    expect(points).toHaveLength(2)
    expect(points[0]).toEqual({ label: '09-21', cost: 3 })
    expect(points[1]).toEqual({ label: '09-28', cost: 4 })
  })

  it('folds a year into months, in order, named for the locale', () => {
    const days = [day('2026-11-02', 3), day('2026-01-05', 1), day('2026-01-06', 2)]

    const zh = waveSeries({ days, slices: [], range: 'year' }, true)
    expect(zh).toEqual([{ label: '1月', cost: 3 }, { label: '11月', cost: 3 }])
    expect(waveSeries({ days, slices: [], range: 'year' }, false)[0]?.label).toBe('1')
  })

  it('keeps same-numbered months of different years apart', () => {
    const days = [day('2025-10-05', 2), day('2026-10-05', 3)]
    const points = waveSeries({ days, slices: [], range: 'year' }, true)

    expect(points).toEqual([
      { label: '2025-10', cost: 2 },
      { label: '2026-10', cost: 3 },
    ])
  })

  it('draws the quiet days between active ones when the window is stated', () => {
    const days = [day('2026-10-01', 1), day('2026-10-20', 2), day('2026-10-21', 3)]
    const points = waveSeries({
      days,
      slices: [],
      range: 'month',
      from: '2026-10-01',
      to: '2026-10-21',
    }, false)

    expect(points).toHaveLength(21)
    expect(points[0]).toEqual({ label: '10-01', cost: 1 })
    expect(points[1]).toEqual({ label: '10-02', cost: 0 })
    expect(points[19]).toEqual({ label: '10-20', cost: 2 })
    expect(points[20]).toEqual({ label: '10-21', cost: 3 })
  })

  it('fills quiet weeks in a quarter before and between active ones', () => {
    const points = waveSeries({
      days: [day('2026-09-23', 2), day('2026-10-14', 4)],
      slices: [],
      range: 'quarter',
      from: '2026-09-21',
      to: '2026-10-18',
    }, false)

    expect(points.map(point => point.label)).toEqual(['09-21', '09-28', '10-05', '10-12'])
    expect(points.map(point => point.cost)).toEqual([2, 0, 0, 4])
  })

  it('answers nothing for a window that recorded nothing', () => {
    expect(waveSeries({ days: [], slices: [], range: 'year' }, false)).toEqual([])
    expect(waveSeries({ days: [], slices: [], range: 'day' }, false)).toEqual([])
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
