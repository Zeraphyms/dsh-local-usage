/**
 * The call log: every billed settlement, filtered, ordered and paged.
 *
 * The report answers what a window was made of; this answers what each request
 * in it was. That is the one question the folds above it deliberately throw
 * away — a day keeps a sum, a route keeps a sum, a session keeps a sum — and it
 * is the question a reader asks when a figure looks wrong, when a cache hit rate
 * moved, or when one call's output dwarfs the rest.
 *
 * Every field comes from samples the Host already holds in its per-session fold:
 * the query never opens a log, and paging it is a walk over memory rather than a
 * second read. The walk prices every sample because the page's totals and its
 * model facets are over the whole match, not over the fifty rows on screen.
 *
 * @module dsh-local-usage/calls
 */
import type { PricingOptions, SessionUsageInput } from './aggregate.ts';
import type { UsageCallsQuery, UsageCallsReport } from './types.ts';
/** Facts about the read behind one query, repeated onto its answer. */
export interface CallsMeta {
    /** Host clock when the answer was cut. */
    readonly generatedAt: number;
    /** Sessions the time window was folded from. */
    readonly scannedSessions: number;
    /** Sessions that could not be read. */
    readonly unreadableSessions: number;
    /** Whether the fold came from the Host's cache rather than a fresh read. */
    readonly cached: boolean;
}
/**
 * Cut one page of the call log out of the folds the report already prices.
 *
 * The window is applied here from the query's own bounds, so a caller may hand
 * over whole session folds as readily as pre-filtered ones. Facets are collected
 * before the model/route/session/text filters, so a model filter never removes
 * the models a reader could switch to.
 *
 * @param inputs - per-session samples already reduced to the query's window.
 * @param options - the rate card and peak schedule every row is priced with.
 * @param query - the filter, order and page the reader asked for.
 * @param meta - facts about the read, repeated onto the answer.
 * @returns the page, the totals of every match, and the window's route facets.
 */
export declare function queryCalls(inputs: readonly SessionUsageInput[], options: PricingOptions, query: UsageCallsQuery, meta: CallsMeta): UsageCallsReport;
