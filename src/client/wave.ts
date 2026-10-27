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
  /** First local day of the window, when empty days should be drawn too. */
  readonly from?: string
  /** Last local day of the window, inclusive. */
  readonly to?: string
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

/** The UTC day number of a `YYYY-MM-DD` key, or `undefined` when malformed. */
function dayNumber(day: string): number | undefined {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (matched === null) return undefined
  return Date.UTC(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3])) / 86_400_000
}

/** The `YYYY-MM-DD` key of a UTC day number. */
function dayKeyOf(number: number): string {
  const date = new Date(number * 86_400_000)
  return `${String(date.getUTCFullYear())}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** Every day key from `from` to `to`, inclusive, both well formed. */
function daysBetween(from: string, to: string): string[] {
  const start = dayNumber(from)
  const end = dayNumber(to)
  if (start === undefined || end === undefined || end < start) return []
  return Array.from({ length: end - start + 1 }, (_, offset) => dayKeyOf(start + offset))
}

/** The `YYYY-MM` key of a day key. */
function monthKeyOf(day: string): string | undefined {
  const matched = /^(\d{4})-(\d{2})-\d{2}$/.exec(day)
  return matched === null ? undefined : `${matched[1]}-${matched[2]}`
}

/** Every `YYYY-MM` key touching a day range, inclusive. */
function monthsBetween(from: string, to: string): string[] {
  const start = monthKeyOf(from)
  const end = monthKeyOf(to)
  if (start === undefined || end === undefined) return []
  const startDate = new Date(`${start}-01T00:00:00Z`)
  const endDate = new Date(`${end}-01T00:00:00Z`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return []
  const keys: string[] = []
  const cursor = new Date(startDate)
  while (cursor.getTime() <= endDate.getTime()) {
    keys.push(`${String(cursor.getUTCFullYear())}-${pad(cursor.getUTCMonth() + 1)}`)
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return keys
}

/** `YYYY-MM` as the axis label, with the year only when the window crosses one. */
function monthKeyLabel(key: string, crossYear: boolean, zh: boolean): string {
  const matched = /^(\d{4})-(\d{2})$/.exec(key)
  if (matched === null) return key
  const month = Number(matched[2])
  return crossYear ? `${matched[1]}-${matched[2]}` : monthLabel(month, zh)
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
  // Twenty-four hours is the other window the day rows cannot describe: it ends
  // mid-day, so its two calendar days are each partial. The report's hour slices
  // fold every sample the window carried by Beijing clock time — the two days'
  // shared hours sum together, which is the truth about when in the day the
  // spend happened — so the same 144 buckets serve, relabelled every sixth point.
  if (input.range === 'h24') {
    const all = (input.slices ?? []).map(row => ({ label: clockLabel(row.minutes), cost: row.cost }))
    // 144 points is too dense for 24 hours of context; keep every sixth hour.
    return all.filter((_, index) => index % 6 === 0 || index === all.length - 1)
  }
  // Everything the corpus holds: the span is open-ended, so no calendar ladder
  // fits — month buckets, drawn only for the months the day rows name.
  if (input.range === 'all') {
    const byMonth = new Map<string, number>()
    for (const day of input.days) {
      const key = monthKeyOf(day.day)
      if (key === undefined) continue
      byMonth.set(key, (byMonth.get(key) ?? 0) + day.cost)
    }
    const keys = [...byMonth.keys()].sort()
    const crossYear = keys.length > 0
      && keys[0]?.slice(0, 4) !== keys[keys.length - 1]?.slice(0, 4)
    return keys.map(key => ({
      label: monthKeyLabel(key, crossYear, zh),
      cost: byMonth.get(key) ?? 0,
    }))
  }
  if (input.range === 'year') {
    const byMonth = new Map<string, number>()
    for (const day of input.days) {
      const key = monthKeyOf(day.day)
      if (key === undefined) continue
      byMonth.set(key, (byMonth.get(key) ?? 0) + day.cost)
    }
    // The key carries the year: October 2025 and October 2026 are two points,
    // not one bucket that quietly adds two years together.
    const keys = input.from !== undefined && input.to !== undefined
      ? monthsBetween(input.from, input.to)
      : [...byMonth.keys()].sort()
    const crossYear = keys.length > 0
      && keys[0]?.slice(0, 4) !== keys[keys.length - 1]?.slice(0, 4)
    return keys.map(key => ({
      label: monthKeyLabel(key, crossYear, zh),
      cost: byMonth.get(key) ?? 0,
    }))
  }
  if (input.range === 'quarter') {
    const byWeek = new Map<number, { label: string; cost: number }>()
    for (const day of input.days) {
      const start = weekStartOf(day.day)
      const bucket = byWeek.get(start)
      if (bucket === undefined) byWeek.set(start, { label: dayLabel(dayKeyOf(start)), cost: day.cost })
      else byWeek.set(start, { label: bucket.label, cost: bucket.cost + day.cost })
    }
    // With a window, every week it touches is drawn, quiet ones included; the
    // gaps between active weeks are elapsed time, not a shorter axis.
    const starts = input.from !== undefined && input.to !== undefined
      ? [...new Set(daysBetween(input.from, input.to).map(weekStartOf))].sort((left, right) => left - right)
      : [...byWeek.keys()].sort((left, right) => left - right)
    return starts.map(start => byWeek.get(start) ?? { label: dayLabel(dayKeyOf(start)), cost: 0 })
  }
  // A week or a month: a point a day, which is the resolution both are read at.
  if (input.from !== undefined && input.to !== undefined) {
    const byDay = new Map(input.days.map(day => [day.day, day.cost]))
    return daysBetween(input.from, input.to).map(key => ({
      label: dayLabel(key),
      cost: byDay.get(key) ?? 0,
    }))
  }
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
