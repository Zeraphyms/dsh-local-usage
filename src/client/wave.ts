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

import type { UsageDayRow, UsageHourRow, UsageRouteSeries } from '../types.ts'

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
  readonly hourly: readonly UsageHourRow[]
  /**
   * Each route's own series over the window, which the swell is stacked from.
   *
   * Empty for a Host that does not fold it yet: the figure then draws the single
   * total series, which is exactly the shape the swell had before routes existed.
   */
  readonly routeSeries: readonly UsageRouteSeries[]
  /** Range id: `day`, `week`, `month`, `quarter` or `year`. */
  readonly range: string
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
    return input.hourly.map(row => ({ label: pad(row.hour), cost: row.cost }))
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
 * Which of the window's routes get their own swells.
 *
 * The window's spend is the sum of its routes, and the interesting question is
 * how much of it is the ones on top: the figure draws the few dearest as their
 * own series and folds the rest into one.
 */
export const STACK_ROUTES = 4

/** One swell of the stack: a route, its share of the window, and its own points. */
export interface StackLayer {
  /** The route this swell belongs to, or `unknown` for a route the log did not name. */
  readonly route: string
  /** Its money over the window, which the legend names. */
  readonly cost: number
  /** Its own buckets, on the same axes as the total's points. */
  readonly points: readonly WavePoint[]
}

/** What the stack is drawn from, reduced to the routes worth a swell of their own. */
export interface StackedWave {
  /** The dearest routes, each with its own buckets, dearest first. */
  readonly layers: readonly StackLayer[]
  /** The remaining routes folded into one layer, or `undefined` when there are none. */
  readonly remainder: StackLayer | undefined
  /** The window's totals across every route, which the axis and the total read. */
  readonly totalPoints: readonly WavePoint[]
}

/**
 * Which routes the window's spend is really made of.
 *
 * Fewer than three routes never need a remainder, and a remainder that is less
 * than this share of the window is folded in even when it would earn one: a
 * swell for the long tail reads as noise next to the routes that made it long.
 */
const REMAINDER_THRESHOLD = 0.04

/**
 * Stack a window's routes into the swells the figure draws.
 *
 * Dearest first, up to {@link STACK_ROUTES} of them, the rest folded into one
 * remainder. The axes are the total's buckets: each layer's points are the same
 * length in the same order, because a stack drawn from ragged series is ragged
 * where a route did nothing, and a stacked area cannot be read over that.
 *
 * @param input - the range's rows, its hours, and its route series.
 * @param zh - whether the labels are written in Chinese.
 * @returns the layers, the remainder, and the totals the axis reads.
 */
export function waveStack(input: WaveInput, zh: boolean): StackedWave {
  const totalPoints = waveSeries(input, zh)
  // Defensive against a report built by hand, where the fold the wire carries
  // has no shape at all: a stack with no routes is the total series itself.
  const routeSeries = input.routeSeries ?? []
  if (routeSeries.length === 0) {
    return { layers: [], remainder: undefined, totalPoints }
  }

  const layers: StackLayer[] = []
  let remainder: StackLayer | undefined
  for (const [index, series] of routeSeries.entries()) {
    const points = bucketOfSeries(series, input.range, totalPoints, zh)
    const cost = points.reduce((sum, point) => sum + point.cost, 0)
    const layer: StackLayer = { route: series.route, cost, points }
    if (index < STACK_ROUTES) {
      layers.push(layer)
    } else if (remainder === undefined) {
      remainder = { route: 'other', cost, points: [...points] }
    } else {
      remainder = {
        route: 'other',
        cost: remainder.cost + cost,
        points: remainder.points.map((point, at) => ({
          label: point.label,
          cost: point.cost + (points[at]?.cost ?? 0),
        })),
      }
    }
  }

  const total = totalPoints.reduce((sum, point) => sum + point.cost, 0)
  if (remainder !== undefined && total > 0 && remainder.cost / total < REMAINDER_THRESHOLD) {
    remainder = undefined
  }
  return { layers, remainder, totalPoints }
}

/**
 * One route's series, bucketed on the total's axes.
 *
 * The route's own rows come with their gaps, and the axes' buckets are the ones
 * the window's totals already sit in: a route's bucket is whichever of those its
 * day falls into, so a layer and the total line up bucket for bucket.
 *
 * @param series - the route's day rows, ascending, gaps included.
 * @param range - the range id the buckets come from.
 * @param zh - whether the labels are written in Chinese.
 * @returns the route's buckets on the total's axes.
 */
function bucketOfSeries(
  series: UsageRouteSeries,
  range: string,
  totalPoints: readonly WavePoint[],
  zh: boolean,
): WavePoint[] {
  // Fold the route's own rows through the same bucketing the totals went
  // through, so a route's layer reads on the same axes as the window's own
  // crest. The route's gaps stay in the fold's care — a route that did nothing
  // on a day owes the stack a zero for that day, and the bucketing knows which
  // day each bucket holds.
  const folded = waveSeries({
    days: series.days.map(day => ({
      day: day.day,
      cost: day.cost,
      calls: day.calls,
      sessions: 0,
      uncachedInputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })),
    hourly: [],
    routeSeries: [],
    range,
  }, zh)
  // Align onto the total's buckets: a bucket the route had nothing in is zero on
  // its layer, so the stack and the totals read against the same axis.
  const dayCost = new Map(folded.map(point => [point.label, point.cost]))
  return totalPoints.map(point => ({
    label: point.label,
    cost: dayCost.get(point.label) ?? 0,
  }))
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
