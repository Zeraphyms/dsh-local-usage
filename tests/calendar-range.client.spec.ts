/**
 * The year of cells, read as a selected range.
 *
 * The calendar answers "what did this year look like"; the range selector folds
 * the figures above it over a window inside that year. These pin the bridge
 * between the two: the days inside the range are marked on the grid, the days
 * outside it are marked as out, and the caption names the range — including the
 * single-day case, where naming the same date twice would read as a mistake.
 *
 * @module dsh-local-usage/tests/calendar-range
 */

import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CalendarHeatmap } from '../src/client/CalendarHeatmap.tsx'
import { dayTime } from '../src/client/heatmap-grid.ts'
import type { UsageDayRow } from '../src/types.ts'

/** A translate function that names its key, so markup can be searched for one. */
const t = ((key: string, params?: Record<string, string>): string =>
  params === undefined ? key : `${key}(${Object.values(params).join(',')})`) as never

const DAY = 86_400_000

/** One day row with the given amount of usage. */
function day(dayKey: string, cost: number): UsageDayRow {
  return {
    day: dayKey,
    cost,
    calls: 1,
    sessions: 1,
    uncachedInputTokens: 10,
    outputTokens: 10,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  }
}

/** A 52-week window opening on a Sunday and ending on a Saturday. */
const WINDOW_FROM = dayTime('2025-10-26') ?? 0
const WINDOW_TO = (dayTime('2026-10-24') ?? 0) + DAY - 1

/** The calendar with one range selected. */
function calendar(from: string, to: string): string {
  return renderToStaticMarkup(createElement(CalendarHeatmap, {
    from: WINDOW_FROM,
    to: WINDOW_TO,
    rangeFrom: dayTime(from) ?? 0,
    // The range's last instant: the panel hands whole days in.
    rangeTo: (dayTime(to) ?? 0) + DAY - 1,
    days: [day('2026-08-01', 3), day('2026-08-15', 9), day('2026-09-15', 1)],
    totalCost: 13,
    peak: undefined,
    t,
    formatCost: (value: number) => `¥${value.toFixed(2)}`,
    formatInteger: (value: number) => String(value),
    formatDay: (value: string) => value,
    onSelectDay: () => {},
  }))
}

describe('the calendar and the selected range', () => {
  it('marks the days inside the range and the days outside it', () => {
    const markup = calendar('2026-08-01', '2026-08-31')

    expect(markup).toContain('data-range="true"')
    expect(markup).toContain('data-in-range="true"')
    expect(markup).toContain('data-in-range="false"')
    expect(markup).toContain('calendarRangeSelected')
    // One ribbon around the band, not a ring on every day.
    expect(markup).toContain('dlu-rangeBand')
  })

  it('leaves no mark when the range covers the window it sits in', () => {
    const markup = renderToStaticMarkup(createElement(CalendarHeatmap, {
      from: WINDOW_FROM,
      to: WINDOW_TO,
      rangeFrom: WINDOW_FROM,
      rangeTo: WINDOW_TO,
      days: [],
      totalCost: 0,
      peak: undefined,
      t,
      formatCost: (value: number) => `¥${value.toFixed(2)}`,
      formatInteger: (value: number) => String(value),
      formatDay: (value: string) => value,
      onSelectDay: () => {},
    }))

    expect(markup).not.toContain('data-range=')
    expect(markup).not.toContain('calendarRangeSelected')
    expect(markup).not.toContain('dlu-rangeBand')
  })

  it('names a one-day range once, not twice', () => {
    const markup = calendar('2026-08-15', '2026-08-15')

    expect(markup).toContain('calendarRangeSelectedDay')
    expect(markup).not.toContain('calendarRangeSelected(')
  })
})
