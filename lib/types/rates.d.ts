/**
 * Durable per-route rate overrides.
 *
 * The rate cards a profile is configured with are substring rules: convenient,
 * and quietly wrong the moment a route they were never written for happens to
 * contain the substring. An override is the correction — one exact
 * `provider/model`, one set of four bucket prices — and this module owns where
 * it lives.
 *
 * It is a small JSON file under the harness home rather than a storage form:
 * this plugin mounts bare on deployments that have no storage backend, and a
 * rate table the reader typed is worth persisting without making the whole panel
 * depend on a service that may not be there. The file is written through a
 * temporary sibling and renamed, so a crash mid-write cannot leave a truncated
 * table behind.
 *
 * @module dsh-local-usage/rates
 */
import type { UsagePricingUpdate, UsageRate } from './types.ts';
/**
 * The harness home the override file is written under.
 * @param env - process environment, read for `DSH_HOME`.
 * @param home - the user's home directory when `DSH_HOME` is unset.
 * @returns the absolute harness home.
 */
export declare function resolveDshHome(env?: NodeJS.ProcessEnv, home?: string): string;
/**
 * Where one harness home keeps this plugin's override file.
 * @param dshHome - absolute harness home.
 * @returns the absolute path of the file.
 */
export declare function pricingFilePath(dshHome: string): string;
/**
 * Read one rate out of an untrusted value.
 * @param value - a candidate bucket map.
 * @returns the rate, or `undefined` when any bucket is not a sane non-negative price.
 */
export declare function readRate(value: unknown): UsageRate | undefined;
/** The persisted override table, kept in memory and mirrored to disk. */
export interface RateStore {
    /** Every override in effect, keyed by exact route. */
    read(): ReadonlyMap<string, UsageRate>;
    /**
     * Apply one validated update and persist the result.
     * @param update - routes to set; a `null` rate clears that route's override.
     * @returns the table in effect after the write.
     */
    write(update: UsagePricingUpdate): Promise<Record<string, UsageRate>>;
}
/**
 * Create the store for one file, hydrating it from disk immediately.
 *
 * Hydration is synchronous on purpose: the report path is the hot one, this runs
 * once at activation, and the document is a handful of lines. A read that fails
 * is not an error the plugin can act on — an absent or unreadable table is simply
 * no overrides, and the next write replaces the file.
 *
 * @param path - absolute path of the override file.
 * @returns the store.
 */
export declare function createRateStore(path: string): RateStore;
