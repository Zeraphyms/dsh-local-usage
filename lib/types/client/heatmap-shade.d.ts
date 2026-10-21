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
import type { UsageDayRow } from '../types.ts';
/** Tokens of one day row. */
export declare function tokensOf(row: UsageDayRow): number;
/** Linear-interpolated quantile of an ascending, non-empty sample. */
export declare function quantile(sorted: readonly number[], q: number): number;
/** Shading thresholds over the window's active days. */
export interface ShadeLevels {
    readonly t1: number;
    readonly t2: number;
    readonly t3: number;
}
/** The quantile thresholds for one window's active days. */
export declare function shadeLevels(days: readonly UsageDayRow[]): ShadeLevels;
/** The ramp level `0..4` one token total sits at. */
export declare function shadeLevel(tokens: number, levels: ShadeLevels): 0 | 1 | 2 | 3 | 4;
