/**
 * The HTTP surface: query parsing, status codes, JSON answers, and the route
 * registration that mounts the report, the call log, progress and the rate table.
 *
 * This module is the only place that knows an HTTP `Request` exists. The service
 * above it takes windows and queries; the reader takes a corpus. Keeping the
 * translation here is what lets the entry read as activation wiring.
 *
 * @module dsh-local-usage/host/http-routes
 */
import type { Context } from '@deepseek-ai/cordis';
import type { FoldCache } from '../fold-cache.ts';
import type { ProgressTracker } from '../progress.ts';
import type { RateStore } from '../rates.ts';
import type { UsageInsightsConfig } from './config.ts';
import type { CachedSession } from './session-fold.ts';
/** Runs one corpus read after every read queued before it has settled. */
export type SerializedRead = <T>(task: () => Promise<T>) => Promise<T>;
/** Everything the four route registrations need from the activation. */
export interface RouteDependencies {
    readonly ctx: Context;
    readonly cache: Map<string, CachedSession>;
    readonly folds: FoldCache;
    readonly progress: ProgressTracker;
    readonly config: UsageInsightsConfig;
    readonly rates: RateStore;
    readonly serialize: SerializedRead;
    readonly generations: ReadonlyMap<string, number>;
    readonly background: () => Promise<void> | undefined;
}
/**
 * Register the report, call-log, progress and pricing routes.
 * @param deps - the activation's caches, progress, configuration and queue.
 */
export declare function registerRoutes(deps: RouteDependencies): void;
