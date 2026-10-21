/**
 * Plugin configuration, the shipped rate cards, and the priced options a fold
 * reads.
 *
 * Pure apart from the reader's stored edits, which are passed in: this module
 * owns what a price is configured to be, not how a session log becomes a
 * settlement. Keeping it out of the entry makes the activation path readable as
 * wiring rather than as a rate table.
 *
 * @module dsh-local-usage/host/config
 */
import type { PricingOptions } from '../aggregate.ts';
import type { RateStore } from '../rates.ts';
export interface UsageInsightsPriceConfig {
    /** Cache-miss prompt tokens. */
    input: number;
    /** Cache-hit prompt tokens. */
    cacheRead: number;
    /** Cache-write prompt tokens; providers without a separate write charge repeat `input`. */
    cacheWrite: number;
    /** Generated tokens. */
    output: number;
}
/**
 * One model's prices, with the prices it charges inside a peak window.
 *
 * The four numbers are the price outside a peak window — and the only price of a
 * model that does not state a `peak` block, which is how a flat-priced model is
 * written. Costing the same all day means leaving `peak` out, not setting a
 * multiplier to one.
 */
export interface UsageInsightsModelConfig extends UsageInsightsPriceConfig {
    /** Case-insensitive substring matched against `provider/model`; the first match wins. */
    match: string;
    /** Prices inside a configured peak window; absent means the model is flat-priced. */
    peak?: UsageInsightsPriceConfig;
}
/** The card that prices a route no model claims; it may price peak separately too. */
export type UsageInsightsFallbackConfig = UsageInsightsPriceConfig & {
    /** Prices inside a configured peak window; absent means the fallback is flat-priced. */
    readonly peak?: UsageInsightsPriceConfig;
};
/** Plugin configuration; every field has a default, so the plugin mounts bare. */
export interface UsageInsightsConfig {
    /** Currency every cost figure is expressed in; the plugin performs no conversion. */
    currency: string;
    /** Configured rate cards, matched in order. */
    models: UsageInsightsModelConfig[];
    /** Card used by a route no model matches. */
    fallback: UsageInsightsFallbackConfig;
    /** Peak windows as `HH:MM-HH:MM` in Beijing time. */
    peakWindows: string[];
    /** When true, Saturday and Sunday are never peak. */
    peakWeekdaysOnly: boolean;
    /**
     * Whether to fold the corpus in the background once the process is up.
     *
     * The first read after an install decodes every session log there is, and the
     * reader pays for it while looking at a loading frame. Doing that read at
     * activation moves the cost to a moment nobody is waiting on, so the first
     * request the panel makes is a re-price over folds already in hand. A
     * deployment with a very large corpus, or one that would rather read nothing
     * until it is asked, can turn it off and pay the read on first open instead.
     */
    warmup: boolean;
    /** How long after activation the background fold starts, in milliseconds. */
    warmupDelayMs: number;
}
/**
 * Shipped defaults: one card per model, matched against the routed model first by
 * identity and then by substring, in the order listed.
 *
 * A route served through an aggregator or a reseller has to be priced by the
 * operator, and the panel names every route that fell back to the default rather
 * than implying a figure it cannot support. `kimi-k3-1` states the 5-minute
 * cache-write tier; the list's 1-hour tier (40) has no field of its own here.
 */
export declare const DEFAULT_CONFIG: UsageInsightsConfig;
export declare function resolveConfig(config: UsageInsightsConfig): UsageInsightsConfig;
/**
 * Resolve the model cards, the reader's edits, and the peak schedule.
 *
 * The reader's stored edits are applied over the configured cards by model name:
 * an edit is a change to the card, not a second card, so a model that arrives
 * from configuration and one the reader has corrected are the same card in the
 * report and in the editor.
 *
 * @param config - the merged plugin configuration.
 * @param rates - the store of the reader's edits.
 * @returns the options one fold prices with.
 */
export declare function pricingOptions(config: UsageInsightsConfig, rates: RateStore): PricingOptions;
