/**
 * Durable per-session fold cache.
 *
 * Reading a log is the expensive half of this plugin and folding it is not, so
 * the in-memory session cache exists to pay that cost once. It did not survive a
 * restart, which meant every fresh Host process re-decoded the whole corpus
 * before the panel could draw its first cell.
 *
 * What makes the fold cacheable at all is the persistence backend's own change
 * token: `SessionPersistenceSnapshot.revision` identifies one revision of one
 * stored log, and the JSONL backend builds it from the artifact's device, inode,
 * size and nanosecond timestamps. A stored fold whose revision still matches is
 * therefore a fold of exactly the bytes on disk — no re-read, no guessing.
 *
 * A revision that no longer matches, or a session the backend does not list, is
 * simply a miss: the fold is recomputed and the entry replaced. Nothing here can
 * make a figure wrong; the worst a stale or damaged file can do is cost the cold
 * read it was written to avoid.
 *
 * The file lives beside the pricing overrides under the harness home, is written
 * through a temporary sibling and a rename, and is dropped whole when its
 * document version does not match — a bump has to bring a migration with it, the
 * way every other stored shape in this product does.
 *
 * @module dsh-local-usage/fold-cache
 */
import type { ReliabilityDay, UsageSample } from './aggregate.ts';
/**
 * Days of history the cache keeps.
 *
 * The panel reads a rolling window of 52 weeks ending today, so a session whose
 * last recorded activity is older than this can contribute to no window the
 * panel can ask for. The margin above 52 weeks is slack for timezone and
 * calendar-year ranges, not a promise about what is retained: a request reaching
 * further back than what this horizon dropped is answered from a fresh read, not
 * from the cache.
 */
export declare const RETENTION_DAYS = 400;
/**
 * Where one harness home keeps this plugin's fold cache.
 * @param dshHome - absolute harness home.
 * @returns the absolute path of the file.
 */
export declare function foldCacheFilePath(dshHome: string): string;
/** One session's fold, exactly as the in-memory cache holds it. */
export interface CachedFold {
    /** One sample per billable settlement, ascending by time. */
    readonly samples: readonly UsageSample[];
    /** Reliability counters by local day. */
    readonly reliability: readonly ReliabilityDay[];
    readonly title?: string;
    readonly cwd?: string;
    readonly createdAt: number;
}
/** The persisted fold cache, kept in memory and mirrored to disk. */
export interface FoldCache {
    /**
     * The fold stored for one session, when it was folded from exactly this revision.
     * @param sessionId - durable session id.
     * @param revision - the revision the log carries now.
     * @param from - the request's inclusive lower bound, or `undefined` when unbounded.
     * @returns the stored fold, or `undefined` on any kind of miss.
     */
    read(sessionId: string, revision: string, from: number | undefined): CachedFold | undefined;
    /**
     * Record one session's fold under the revision it was folded from.
     * @param sessionId - durable session id.
     * @param revision - the revision the fold corresponds to.
     * @param fold - the fold to store.
     */
    write(sessionId: string, revision: string, fold: CachedFold): void;
    /**
     * Persist the cache, dropping entries no window can reach any more.
     * @param now - the instant retention is measured from.
     */
    flush(now?: number): Promise<void>;
}
/**
 * Create the cache for one file, hydrating it from disk immediately.
 *
 * Hydration is synchronous for the same reason the rate store's is: it runs once
 * at activation, off the request path, and everything after it is a map lookup.
 * A read that fails is not an error this plugin can act on — an absent, damaged
 * or future-versioned file is simply an empty cache, and the next flush replaces
 * it.
 *
 * @param path - absolute path of the cache file.
 * @returns the cache.
 */
export declare function createFoldCache(path: string): FoldCache;
