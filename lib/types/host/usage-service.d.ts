/**
 * The usage service: the report and the call log read the same corpus, price the
 * same samples, and differ only in the question they answer.
 *
 * Both entry points take the reader and the progress tracker from the caller:
 * the entry owns activation and serializes reads, while this module owns what a
 * window means to each surface. Keeping the build of a report here — rather than
 * in the HTTP handler — makes the service testable without a Request.
 *
 * @module dsh-local-usage/host/usage-service
 */
import type { Context } from '@deepseek-ai/cordis';
import type { FoldCache } from '../fold-cache.ts';
import type { ProgressTracker } from '../progress.ts';
import type { RateStore } from '../rates.ts';
import type { UsageCallsQuery, UsageCallsReport, UsageInsightsReport } from '../types.ts';
import type { UsageInsightsConfig } from './config.ts';
import type { CachedSession } from './session-fold.ts';
/**
 * Build the priced report over every readable session log.
 *
 * @param ctx - host context carrying the session query engine.
 * @param cache - the in-memory fold cache, keyed by session id.
 * @param folds - the durable fold cache, keyed by session id and log revision.
 * @param progress - publishes how far this read has got.
 * @param config - resolved plugin configuration.
 * @param rates - the reader's price edits.
 * @param request - the window to fold and whether to discard the caches first.
 * @returns the complete priced report.
 */
export declare function assembleReport(ctx: Context, cache: Map<string, CachedSession>, folds: FoldCache, progress: ProgressTracker, config: UsageInsightsConfig, rates: RateStore, request: {
    refresh: boolean;
    from: number | undefined;
    to: number | undefined;
}, generations: ReadonlyMap<string, number>): Promise<UsageInsightsReport>;
/**
 * Read one call-log page out of the same folds the report uses.
 *
 * The window is applied by the reader; the model, route, session, text, order
 * and page are applied by the query. Totals and route facets cover the whole
 * match, not the page the caller is about to draw.
 * @param ctx - host context carrying the session query engine.
 * @param cache - the in-memory fold cache.
 * @param folds - the durable fold cache.
 * @param progress - the read's progress.
 * @param config - resolved plugin configuration.
 * @param rates - the reader's price edits.
 * @param query - the call-log query.
 * @param generations - session invalidation generations captured by this read.
 * @returns one page and the totals of every match.
 */
export declare function queryCallPage(ctx: Context, cache: Map<string, CachedSession>, folds: FoldCache, progress: ProgressTracker, config: UsageInsightsConfig, rates: RateStore, query: UsageCallsQuery, generations: ReadonlyMap<string, number>, refresh?: boolean): Promise<UsageCallsReport>;
