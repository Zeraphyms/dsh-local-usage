/**
 * Usage statistics Host half: activation, the shared caches, and the read queue.
 *
 * The entry is deliberately the only place that wires the plugin together:
 * configuration arrives here, the corpus caches live here, session invalidation
 * is subscribed here, and every HTTP route is registered here. The work behind
 * those routes lives in `host/`: folds, the corpus reader, the usage service and
 * the HTTP surface.
 *
 * Reading a log is the expensive half and folding it is not, so the cache keeps
 * each session's extracted samples rather than a finished report, and every
 * request re-prices them against the current configuration.
 *
 * @module dsh-local-usage
 */
import type { Context } from '@deepseek-ai/cordis';
import type { UsageInsightsConfig } from './host/config.ts';
export type * from './types.ts';
export { CALLS_PATH, PRICING_PATH, PROGRESS_PATH, REPORT_PATH } from './host/routes.ts';
export { DEFAULT_CONFIG } from './host/config.ts';
export type { UsageInsightsConfig, UsageInsightsFallbackConfig, UsageInsightsModelConfig, UsageInsightsPriceConfig, } from './host/config.ts';
/** Plugin name the loader row addresses. */
export declare const name = "dsh-local-usage";
/** Services this plugin cannot work without: the carrier's route registry and the session reads. */
export declare const inject: string[];
/**
 * Register this plugin's Fetch routes and the background fold.
 *
 * Deliberately a named export with no default: the Loader takes a module's
 * default export when it has one, and a default that is the bare `apply`
 * function is a plugin *without* this module's `name` and `inject` — the fiber
 * then activates with an empty inject list and the first service read throws
 * "cannot get property … without inject".
 *
 * @param ctx - Host context carrying the carrier and the session query engine.
 * @param config - plugin configuration; omitted fields keep their defaults.
 */
export declare function apply(ctx: Context, config?: UsageInsightsConfig): void;
