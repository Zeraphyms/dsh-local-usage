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
import type { UsageDayRow, UsageSessionRow } from '../types.ts';
/**
 * One figure against the same figure in the window before it.
 *
 * `ratio` is deliberately absent when there is nothing to divide by: a window
 * that started from nothing did not grow by some percentage, and stating one
 * would be inventing a rate out of a zero.
 */
export interface Change {
    /** The figure this window reported. */
    readonly value: number;
    /** The same figure one window earlier. */
    readonly previous: number;
    /** `value - previous`. */
    readonly delta: number;
    /** `delta / previous`, present only when `previous` is not zero. */
    readonly ratio?: number;
}
/**
 * Read one figure against its predecessor.
 * @param value - this window's figure.
 * @param previous - the window before's figure.
 * @returns the change, with a ratio only when one is meaningful.
 */
export declare function changeOf(value: number, previous: number): Change;
/** One weekday's share of a window. */
export interface WeekdayRow {
    /** Weekday index, Sunday `0`, matching the calendar's own columns. */
    readonly weekday: number;
    /** Money spent on that weekday over the window. */
    readonly cost: number;
    /** Billed settlements on that weekday. */
    readonly calls: number;
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
export declare function weekdayProfile(days: readonly UsageDayRow[]): WeekdayRow[];
/**
 * The largest value one column reaches, for drawing bars as shares of it.
 * @param rows - the rows to measure.
 * @param value - reads the column.
 * @returns the largest value, or `0` for no rows.
 */
export declare function largestOf<T>(rows: readonly T[], value: (row: T) => number): number;
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
export declare function topSessions(sessions: readonly UsageSessionRow[], limit: number): UsageSessionRow[];
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
export declare function daysToCsv(days: readonly UsageDayRow[]): string;
