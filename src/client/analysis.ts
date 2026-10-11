/**
 * Derivations the range's detail view draws from a report.
 *
 * The Host answers with folds — rows per day, per route, per session — and the
 * detail view needs *readings* of them: how a figure moved against the window
 * before it, which weekday carries the spend, what an average is over, and a
 * table a spreadsheet can open. Those are pure functions of a report, so they
 * live here rather than in the component, where they can be tested without a
 * browser and reasoned about without one.
 *
 * @module dsh-local-usage/client/analysis
 */

import type { UsageDayRow, UsageSessionRow } from '../types.ts'
import { dayTime } from './heatmap-grid.ts'

/**
 * One figure against the same figure in the window before it.
 *
 * `ratio` is deliberately absent when there is nothing to divide by: a window
 * that started from nothing did not grow by some percentage, and stating one
 * would be inventing a rate out of a zero.
 */
export interface Change {
  /** The figure this window reported. */
  readonly value: number
  /** The same figure one window earlier. */
  readonly previous: number
  /** `value - previous`. */
  readonly delta: number
  /** `delta / previous`, present only when `previous` is not zero. */
  readonly ratio?: number
}

/**
 * Read one figure against its predecessor.
 * @param value - this window's figure.
 * @param previous - the window before's figure.
 * @returns the change, with a ratio only when one is meaningful.
 */
export function changeOf(value: number, previous: number): Change {
  const delta = value - previous
  return previous === 0 ? { value, previous, delta } : { value, previous, delta, ratio: delta / previous }
}

/** One weekday's share of a window. */
export interface WeekdayRow {
  /** Weekday index, Sunday `0`, matching the calendar's own columns. */
  readonly weekday: number
  /** Money spent on that weekday over the window. */
  readonly cost: number
  /** Billed settlements on that weekday. */
  readonly calls: number
}

/**
 * Fold a window's days by weekday, Sunday first.
 *
 * Sunday first because the calendar above the detail view is Sunday first: a
 * profile in another order could not be read against the grid it summarises.
 * Always seven rows, including weekdays the window never touched.
 *
 * @param days - the report's day rows.
 * @returns seven rows in weekday order.
 */
export function weekdayProfile(days: readonly UsageDayRow[]): WeekdayRow[] {
  const rows: WeekdayRow[] = Array.from({ length: 7 }, (_, weekday) => ({ weekday, cost: 0, calls: 0 }))
  for (const day of days) {
    const time = dayTime(day.day)
    if (time === undefined) continue
    const row = rows[new Date(time).getDay()]
    if (row === undefined) continue
    rows[row.weekday] = { weekday: row.weekday, cost: row.cost + day.cost, calls: row.calls + day.calls }
  }
  return rows
}

/**
 * The largest value one column reaches, for drawing bars as shares of it.
 * @param rows - the rows to measure.
 * @param value - reads the column.
 * @returns the largest value, or `0` for no rows.
 */
export function largestOf<T>(rows: readonly T[], value: (row: T) => number): number {
  let largest = 0
  for (const row of rows) {
    const candidate = value(row)
    if (candidate > largest) largest = candidate
  }
  return largest
}

/**
 * The window's most expensive sessions, dearest first.
 *
 * Sorted here rather than trusted from the wire: the order is a property of this
 * view, and a Host that sent another one would silently show a different list.
 *
 * @param sessions - the report's session rows.
 * @param limit - how many to keep.
 * @returns at most `limit` rows, dearest first.
 */
export function topSessions(
  sessions: readonly UsageSessionRow[],
  limit: number,
): UsageSessionRow[] {
  return [...sessions]
    .sort((left, right) => right.cost - left.cost || right.updatedAt - left.updatedAt)
    .slice(0, Math.max(0, limit))
}

/** One CSV field, quoted only when it has to be. */
function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/** The columns the exported table carries, in order. */
const CSV_COLUMNS = [
  'day',
  'cost',
  'uncachedInputTokens',
  'outputTokens',
  'cacheReadTokens',
  'cacheWriteTokens',
  'calls',
  'sessions',
] as const

/**
 * Render a window's days as CSV.
 *
 * Raw figures rather than formatted ones: this is for a spreadsheet, where a
 * currency symbol and a thousands separator are noise, and a reader's locale
 * should not decide what a column means. The day key is the wire's sortable
 * `YYYY-MM-DD`, which every spreadsheet reads as a date.
 *
 * @param days - the report's day rows.
 * @returns one header line and one line per day, newline-terminated.
 */
export function daysToCsv(days: readonly UsageDayRow[]): string {
  const lines = [CSV_COLUMNS.join(',')]
  for (const day of days) {
    lines.push([
      day.day,
      String(day.cost),
      String(day.uncachedInputTokens),
      String(day.outputTokens),
      String(day.cacheReadTokens),
      String(day.cacheWriteTokens),
      String(day.calls),
      String(day.sessions),
    ].map(csvField).join(','))
  }
  return `${lines.join('\n')}\n`
}
