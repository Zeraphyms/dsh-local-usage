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
import type { UsageDayRow, UsageDaySlice } from '../types.ts';
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
    readonly slices: readonly UsageDaySlice[];
    /** Range id: `day`, `week`, `month`, `quarter` or `year`. */
    readonly range: string;
    /** First local day of the window, when empty days should be drawn too. */
    readonly from?: string;
    /** Last local day of the window, inclusive. */
    readonly to?: string;
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
 * Lay points out across a unit square.
 *
 * A flat window is drawn flat rather than as a zero-height line at the top: with
 * nothing to scale against, every point belongs on the baseline.
 *
 * @param points - the buckets, oldest first.
 * @returns unit-square coordinates, one per point.
 */
export declare function wavePlot(points: readonly WavePoint[]): WavePlotPoint[];
