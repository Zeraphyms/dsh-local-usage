/**
 * The calendar's shade ramp: token totals, quantile thresholds and the level a
 * cell is painted at.
 *
 * Pure and data-in, so the scale can be tested without a browser. The thresholds
 * are quantiles over the window's active days, which is what lets the ramp adapt
 * to a profile's own distribution instead of assuming a spend curve.
 *
 * @module dsh-local-usage/client/heatmap-shade
 */

import type { UsageDayRow } from '../types.ts'

/** Tokens of one day row. */
export function tokensOf(row: UsageDayRow): number {
  return row.uncachedInputTokens + row.outputTokens + row.cacheReadTokens + row.cacheWriteTokens
}

/** Linear-interpolated quantile of an ascending, non-empty sample. */
export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0
  const position = (sorted.length - 1) * q
  const base = Math.floor(position)
  const left = sorted[base] ?? 0
  const right = sorted[Math.min(sorted.length - 1, base + 1)] ?? left
  return left + (right - left) * (position - base)
}

/** Shading thresholds over the window's active days. */
export interface ShadeLevels {
  readonly t1: number
  readonly t2: number
  readonly t3: number
}

/** The quantile thresholds for one window's active days. */
export function shadeLevels(days: readonly UsageDayRow[]): ShadeLevels {
  const active = days
    .map(tokensOf)
    .filter(tokens => tokens > 0)
    .sort((left, right) => left - right)
  if (active.length === 0) return { t1: 0, t2: 0, t3: 0 }
  return {
    t1: quantile(active, 0.5),
    t2: quantile(active, 0.75),
    t3: quantile(active, 0.9),
  }
}

/** The ramp level `0..4` one token total sits at. */
export function shadeLevel(tokens: number, levels: ShadeLevels): 0 | 1 | 2 | 3 | 4 {
  if (tokens <= 0) return 0
  if (tokens <= levels.t1) return 1
  if (tokens <= levels.t2) return 2
  if (tokens <= levels.t3) return 3
  return 4
}
