/**
 * The range's shape: one wave of spending, bucketed to fit the window.
 *
 * The calendar answers a year at a year's scale; this answers the selected range
 * at the range's. What the buckets are is a property of the window, not of the
 * chart: an hour each for a day, a day each for a week or a month, a week each
 * for a quarter, a month each for a year. Drawing 365 hairlines for a year, or 24
 * bars for one, would both be the same mistake in opposite directions.
 *
 * Pure and data-in, so the bucketing is testable without a browser and the figure
 * that draws it stays a drawing.
 *
 * @module dsh-local-usage/client/wave
 */

import type { UsageDayRow, UsageDaySlice } from '../types.ts'

/** One bucket of the wave: a label for the axis and the money it holds. */
export interface WavePoint {
  /** Short axis label, already in the reader's terms. */
  readonly label: string
  /** Money spent in this bucket. */
  readonly cost: number
}

/** What the wave is drawn from. */
export interface WaveInput {
  /** The range's day rows, ascending, gaps omitted. */
  readonly days: readonly UsageDayRow[]
  /** The range's hours, Beijing time; only a one-day window uses them. */
  readonly slices: readonly UsageDaySlice[]
  /** Range id: `day`, `week`, `month`, `quarter` or `year`. */
  readonly range: string
}

/** `HH:mm` for minutes after midnight, the label a day's axis carries. */
function clockLabel(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

/** Two-digit zero padding, for a label that has to line up. */
function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** The local day-of-month and month of a `YYYY-MM-DD` key, or `undefined`. */
function partsOf(day: string): { month: number; date: number } | undefined {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (matched === null) return undefined
  return { month: Number(matched[2]), date: Number(matched[3]) }
}

/** `MM-DD`, the axis label a day bucket carries. */
function dayLabel(day: string): string {
  const parts = partsOf(day)
  return parts === undefined ? day : `${pad(parts.month)}-${pad(parts.date)}`
}

/** `M月` / `M`, the axis label a month bucket carries. */
function monthLabel(month: number, zh: boolean): string {
  return zh ? `${String(month)}月` : String(month)
}

/** The Monday-to-Sunday week a day belongs to, as its first day's index. */
function weekStartOf(day: string): number {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (matched === null) return 0
  const time = Date.UTC(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]))
  // Sunday is 0 in `getUTCDay`; the weeks here open on Monday, as a working
  // week does, so a bucket is a week someone worked rather than a calendar one.
  const weekday = (new Date(time).getUTCDay() + 6) % 7
  return Math.floor((time - weekday * 86_400_000) / 86_400_000)
}

/**
 * Bucket a range's usage into the wave's points.
 *
 * @param input - the range's day rows, its hours, and which range it is.
 * @param zh - whether the labels are written in Chinese, for the month names.
 * @returns the points, oldest first; empty when the range recorded nothing.
 */
export function waveSeries(input: WaveInput, zh: boolean): WavePoint[] {
  // A single day is the one window the day rows cannot describe: it has hours.
  if (input.range === 'day') {
    // A report built by hand, or read from a Host that has not learned the fold,
    // carries no slices; the day view then has no profile rather than a crash.
    return (input.slices ?? []).map(row => ({ label: clockLabel(row.minutes), cost: row.cost }))
  }
  if (input.range === 'year') {
    const byMonth = new Map<number, number>()
    for (const day of input.days) {
      const parts = partsOf(day.day)
      if (parts === undefined) continue
      byMonth.set(parts.month, (byMonth.get(parts.month) ?? 0) + day.cost)
    }
    return [...byMonth.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([month, cost]) => ({ label: monthLabel(month, zh), cost }))
  }
  if (input.range === 'quarter') {
    const byWeek = new Map<number, { label: string; cost: number }>()
    for (const day of input.days) {
      const start = weekStartOf(day.day)
      const bucket = byWeek.get(start)
      if (bucket === undefined) byWeek.set(start, { label: dayLabel(day.day), cost: day.cost })
      else byWeek.set(start, { label: bucket.label, cost: bucket.cost + day.cost })
    }
    return [...byWeek.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([, bucket]) => bucket)
  }
  // A week or a month: a point a day, which is the resolution both are read at.
  return input.days.map(day => ({ label: dayLabel(day.day), cost: day.cost }))
}

/** One plotted point: where it sits across the figure, and how high. */
export interface WavePlotPoint {
  /** Share of the width, `0`–`1`. */
  readonly x: number
  /** Share of the height, `0`–`1`, measured from the bottom. */
  readonly y: number
}

/**
 * Lay points out across a unit square.
 *
 * A flat window is drawn flat rather than as a zero-height line at the top: with
 * nothing to scale against, every point belongs on the baseline.
 *
 * @param points - the buckets, oldest first.
 * @returns unit-square coordinates, one per point.
 */
export function wavePlot(points: readonly WavePoint[]): WavePlotPoint[] {
  if (points.length === 0) return []
  const largest = points.reduce((best, point) => (point.cost > best ? point.cost : best), 0)
  const span = points.length === 1 ? 1 : points.length - 1
  return points.map((point, index) => ({
    x: index / span,
    y: largest <= 0 ? 0 : point.cost / largest,
  }))
}
