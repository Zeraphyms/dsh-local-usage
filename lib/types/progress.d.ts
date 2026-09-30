/**
 * What the Host is doing while it assembles a report.
 *
 * The first read after a restart decodes every durable session log, which on a
 * real corpus is seconds of work with nothing on screen to show for it. The work
 * is already counted — one fold per session — so this module publishes that count
 * rather than inventing a spinner: the panel can then say how many logs it has
 * read of how many it has to read.
 *
 * The state is one object, not one per request, because this panel serializes its
 * reads on purpose: the range fold waits for the calendar's window to settle, so
 * two reads never race for the same corpus. A second consumer asking at the same
 * moment would see the read that is actually running, which is the only thing a
 * single object can honestly mean.
 *
 * @module dsh-local-usage/progress
 */
import type { UsageInsightsProgress } from './types.ts';
/** Reads and advances one report assembly's published progress. */
export interface ProgressTracker {
    /** The state the progress route answers with. */
    read(): UsageInsightsProgress;
    /** A read began: the corpus is being enumerated, so its size is not known yet. */
    begin(): void;
    /**
     * The corpus is listed and the fold is starting.
     * @param total - session logs this read has to fold.
     */
    plan(total: number): void;
    /** Every log is folded; the report is being priced from the samples. */
    pricing(): void;
    /** One session log finished folding. */
    advance(): void;
    /** The read settled, whether it succeeded or failed. */
    finish(): void;
}
/**
 * Create one tracker, initially idle.
 * @param clock - the instant source, injectable so a test can pin the timestamps.
 * @returns the tracker.
 */
export declare function createProgressTracker(clock?: () => number): ProgressTracker;
