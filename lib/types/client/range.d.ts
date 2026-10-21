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
import type { UsageInsightsLocaleKey } from './locales.ts';
/** Ranges offered, in selection order. */
export declare const RANGES: readonly {
    readonly id: string;
    readonly key: UsageInsightsLocaleKey;
}[];
/** A hand-picked range, as the two day keys the date fields hold. */
export interface CustomRange {
    readonly from: string;
    readonly to: string;
}
/** Clamp a day key into an inclusive window, so a typed date cannot leave it. */
export declare function clampDay(day: string, from: string, to: string): string;
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
export declare function waveRangeOf(rangeId: string, from: number, to: number): string;
/**
 * Inclusive bounds of one selected range, all ending with today except a range
 * the reader picked by hand.
 * @param id - range id.
 * @param now - the instant the panel treats as today.
 * @param custom - the hand-picked range, when one is selected.
 * @returns the range's `[from, to]` in Unix epoch milliseconds.
 */
export declare function rangeBounds(id: string, now: number, custom?: CustomRange): readonly [number, number];
