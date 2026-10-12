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
import type { UsageDayRow, UsageHourRow, UsageRouteSeries } from '../types.ts';
/** One bucket of the wave: a label for the axis and the money it holds. */
export interface WavePoint {
    /** Short axis label, already in the reader's terms. */
    readonly label: string;
    /** Money spent in this bucket. */
    readonly cost: number;
}
/** What the wave is drawn from. */
export interface WaveInput {
    /** The range's day rows, ascending, gaps omitted. */
    readonly days: readonly UsageDayRow[];
    /** The range's hours, Beijing time; only a one-day window uses them. */
    readonly hourly: readonly UsageHourRow[];
    /**
     * Each route's own series over the window, which the swell is stacked from.
     *
     * Empty for a Host that does not fold it yet: the figure then draws the single
     * total series, which is exactly the shape the swell had before routes existed.
     */
    readonly routeSeries: readonly UsageRouteSeries[];
    /** Range id: `day`, `week`, `month`, `quarter` or `year`. */
    readonly range: string;
}
/**
 * Bucket a range's usage into the wave's points.
 *
 * @param input - the range's day rows, its hours, and which range it is.
 * @param zh - whether the labels are written in Chinese, for the month names.
 * @returns the points, oldest first; empty when the range recorded nothing.
 */
export declare function waveSeries(input: WaveInput, zh: boolean): WavePoint[];
/** One plotted point: where it sits across the figure, and how high. */
export interface WavePlotPoint {
    /** Share of the width, `0`–`1`. */
    readonly x: number;
    /** Share of the height, `0`–`1`, measured from the bottom. */
    readonly y: number;
}
/**
 * Which of the window's routes get their own swells.
 *
 * The window's spend is the sum of its routes, and the interesting question is
 * how much of it is the ones on top: the figure draws the few dearest as their
 * own series and folds the rest into one.
 */
export declare const STACK_ROUTES = 4;
/** One swell of the stack: a route, its share of the window, and its own points. */
export interface StackLayer {
    /** The route this swell belongs to, or `unknown` for a route the log did not name. */
    readonly route: string;
    /** Its money over the window, which the legend names. */
    readonly cost: number;
    /** Its own buckets, on the same axes as the total's points. */
    readonly points: readonly WavePoint[];
}
/** What the stack is drawn from, reduced to the routes worth a swell of their own. */
export interface StackedWave {
    /** The dearest routes, each with its own buckets, dearest first. */
    readonly layers: readonly StackLayer[];
    /** The remaining routes folded into one layer, or `undefined` when there are none. */
    readonly remainder: StackLayer | undefined;
    /** The window's totals across every route, which the axis and the total read. */
    readonly totalPoints: readonly WavePoint[];
}
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
export declare function waveStack(input: WaveInput, zh: boolean): StackedWave;
/**
 * Lay points out across a unit square.
 *
 * A flat window is drawn flat rather than as a zero-height line at the top: with
 * nothing to scale against, every point belongs on the baseline.
 *
 * @param points - the buckets, oldest first.
 * @returns unit-square coordinates, one per point.
 */
export declare function wavePlot(points: readonly WavePoint[]): WavePlotPoint[];
