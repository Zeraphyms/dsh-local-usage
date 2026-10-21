/**
 * One session's durable log folded into the samples and identity facts the
 * report and the call log both read.
 *
 * The fold is pure and shared by the batch projection and the exact read, so the
 * two paths cannot drift apart in what they count. It keeps samples, not a
 * finished report: every request re-cuts the same fold to its own window.
 *
 * @module dsh-local-usage/host/session-fold
 */
import type { SessionEvent } from '@deepseek-ai/dsh-session/types';
import type { ReliabilityDay, SessionUsageInput, UsageSample } from '../aggregate.ts';
/** One cached session fold: the samples, the reliability counters, and the identity facts. */
export interface CachedSession {
    readonly samples: readonly UsageSample[];
    /**
     * Reliability counters by local day, over the same prefix the samples cover.
     *
     * Folded here rather than per request so a window change re-cuts the cache the
     * way it re-cuts samples, and a fork's inherited prefix is excluded exactly as
     * it is for samples: those retries and failed tools were the parent's.
     */
    readonly reliability: readonly ReliabilityDay[];
    readonly title?: string;
    readonly cwd?: string;
    readonly createdAt: number;
}
/** Everything one session's fold reads out of its log. */
interface SessionFoldSource {
    /** The durable log, in seq order, including any fork-inherited prefix. */
    readonly events: readonly SessionEvent[];
    /** Header creation time, repeated onto the report row. */
    readonly createdAt: number;
    /** Header working directory, or `undefined` when it carries none. */
    readonly cwd?: string;
    /**
     * Count of leading events a fork inherited from its parent.
     *
     * A forked log replays its parent's prefix and those turns were already billed
     * under the parent, so the sample fold starts after them. The title fold does
     * not: a fork that never named itself is still titled by the log it grew out
     * of, which is what the harness's own projection does.
     */
    readonly skipBefore: number;
}
/**
 * Fold one session's raw log into the shape the cache keeps.
 *
 * Deliberately pure and shared by both read paths, so the batch projection and
 * the exact read cannot drift apart in what they count.
 *
 * @param source - the log, its header facts, and the prefix to skip.
 * @returns the samples plus the identity facts the report repeats.
 */
export declare function foldSession(source: SessionFoldSource): CachedSession;
/** The reports row a fold contributes to one request's window. */
export declare function sessionInputOf(sessionId: string, entry: CachedSession, request: {
    readonly from: number | undefined;
    readonly to: number | undefined;
}): SessionUsageInput;
/** One session that contributed to a window, with the fold it contributed from. */
export interface Contributor {
    readonly id: string;
    readonly fold: CachedSession;
}
export {};
