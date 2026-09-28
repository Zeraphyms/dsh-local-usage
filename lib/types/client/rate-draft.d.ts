/**
 * Editing the per-route rate table.
 *
 * The editor holds four text fields per route, not four numbers: a reader
 * clearing a field to fall back to the configured rule is a real intention, and
 * a number input cannot tell "empty" from "zero". The drafts are therefore
 * strings until the moment they become an update, and this module owns that
 * translation — which routes actually changed, which were cleared, and which
 * hold something that is not a price.
 *
 * @module dsh-local-usage/client/rate-draft
 */
import type { UsagePricingUpdate, UsageRouteRate } from '../types.ts';
/** The four fields of one route's row, as typed. */
export interface RateDraft {
    input: string;
    cacheRead: string;
    cacheWrite: string;
    output: string;
}
/** Every row's draft, keyed by exact route. */
export type RateDrafts = Record<string, RateDraft>;
/** The four buckets, in the order the editor writes them. */
export declare const RATE_FIELDS: readonly ["input", "cacheRead", "cacheWrite", "output"];
/** One field of one route's row. */
export type RateField = typeof RATE_FIELDS[number];
/** What one set of drafts amounts to. */
export type RateDraftResult = 
/** Nothing to write: every row already matches the rate in effect. */
{
    readonly status: 'empty';
}
/** A row holds text that is not a price; `route` and `field` name it. */
 | {
    readonly status: 'invalid';
    readonly route: string;
    readonly field: RateField;
}
/** A write to send. */
 | {
    readonly status: 'ready';
    readonly update: UsagePricingUpdate;
};
/**
 * The drafts an editor opens on: every route, pre-filled with the rate in effect.
 * @param routes - the routes the window recorded, with their rates.
 * @returns one draft per route.
 */
export declare function draftsFrom(routes: readonly UsageRouteRate[]): RateDrafts;
/**
 * Turn one set of drafts into the write it implies.
 *
 * A row is written only when it differs from what is in effect: a route priced
 * by a rule and left untouched stays on that rule, so the table never fills with
 * overrides that merely restate the configuration. Clearing every field of an
 * overridden row asks for the override to be removed.
 *
 * @param drafts - the fields as typed.
 * @param routes - the routes and the rates currently in effect.
 * @returns nothing to do, the first invalid field, or the update to send.
 */
export declare function pendingUpdate(drafts: RateDrafts, routes: readonly UsageRouteRate[]): RateDraftResult;
