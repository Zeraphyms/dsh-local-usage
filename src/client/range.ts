/**
 * The panel's range vocabulary: presets, a hand-picked window, its bounds, and
 * the bucket the wave reads it at.
 *
 * Pure and time-in, so the date arithmetic can be tested without a browser. The
 * helpers it calls are calendar-based, not millisecond-based: a local day is 23
 * or 25 hours twice a year, and a range that moves by 86,400,000ms is wrong on
 * exactly those days.
 *
 * @module dsh-local-usage/client/range
 */

import { addDays, dayDiff, dayTime, nextDayStart } from './heatmap-grid.ts'
import type { UsageInsightsLocaleKey } from './locales.ts'

/** Ranges offered, in selection order. */
export const RANGES: readonly { readonly id: string; readonly key: UsageInsightsLocaleKey }[] = [
  { id: 'day', key: 'rangeDay' },
  { id: 'h24', key: 'range24h' },
  { id: 'week', key: 'range7' },
  { id: 'month', key: 'rangeMonth' },
  { id: 'year', key: 'rangeYear' },
  { id: 'all', key: 'rangeAll' },
  { id: 'custom', key: 'rangeCustom' },
]

/** A hand-picked range, as the two day keys the date fields hold. */
export interface CustomRange {
  readonly from: string
  readonly to: string
}

/** Clamp a day key into an inclusive window, so a typed date cannot leave it. */
export function clampDay(day: string, from: string, to: string): string {
  return day < from ? from : day > to ? to : day
}

/**
 * The bucket the wave reads a range at.
 *
 * A single day is the one window its hour slices describe; wider ranges fall back
 * to a point per day, then per week, then per month — the same ladder the preset
 * ranges use, chosen by length for one the reader picked by hand.
 * @param rangeId - the selected range.
 * @param from - first instant of the range.
 * @param to - last instant of the range.
 * @returns the id the wave buckets by.
 */
export function waveRangeOf(rangeId: string, from: number, to: number): string {
  if (rangeId !== 'custom') return rangeId
  const days = dayDiff(from, to) + 1
  if (days <= 1) return 'day'
  if (days <= 45) return 'month'
  if (days <= 120) return 'quarter'
  return 'year'
}

/** Local midnight of one instant. */
function startOfDay(time: number): number {
  const date = new Date(time)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** First instant of the month containing `time`. */
function startOfMonth(time: number): number {
  const date = new Date(time)
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
}

/** First instant of the quarter containing `time`. */
function startOfQuarter(time: number): number {
  const date = new Date(time)
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1).getTime()
}

/** First instant of the year containing `time`. */
function startOfYear(time: number): number {
  return new Date(new Date(time).getFullYear(), 0, 1).getTime()
}

/**
 * Inclusive bounds of one selected range, all ending with today except a range
 * the reader picked by hand.
 * @param id - range id.
 * @param now - the instant the panel treats as today.
 * @param custom - the hand-picked range, when one is selected.
 * @returns the range's `[from, to]` in Unix epoch milliseconds.
 */
export function rangeBounds(id: string, now: number, custom?: CustomRange): readonly [number, number] {
  const today = startOfDay(now)
  const end = nextDayStart(today) - 1
  if (id === 'custom') {
    const from = custom === undefined ? today : dayTime(custom.from)
    const to = custom === undefined ? today : dayTime(custom.to)
    if (from !== undefined && to !== undefined && to >= from) return [from, nextDayStart(to) - 1]
    return [today, end]
  }
  if (id === 'day') return [today, end]
  if (id === 'h24') return [now - 24 * 60 * 60 * 1000 + 1, end]
  if (id === 'week') return [addDays(today, -6), end]
  if (id === 'month') return [startOfMonth(now), end]
  if (id === 'quarter') return [startOfQuarter(now), end]
  // Everything the corpus holds: an unbounded window, answered by the Host from
  // whatever days its logs carry.
  if (id === 'all') return [0, Number.MAX_SAFE_INTEGER]
  return [startOfYear(now), end]
}

