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

import type { PricingOptions } from '../aggregate.ts'
import { parsePeakWindow } from '../pricing.ts'
import type { ModelPrice, PeakWindow, PriceRate } from '../pricing.ts'
import type { RateStore } from '../rates.ts'

export interface UsageInsightsPriceConfig {
  /** Cache-miss prompt tokens. */
  input: number
  /** Cache-hit prompt tokens. */
  cacheRead: number
  /** Cache-write prompt tokens; providers without a separate write charge repeat `input`. */
  cacheWrite: number
  /** Generated tokens. */
  output: number
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
  match: string
  /** Prices inside a configured peak window; absent means the model is flat-priced. */
  peak?: UsageInsightsPriceConfig
}

/** The card that prices a route no model claims; it may price peak separately too. */
export type UsageInsightsFallbackConfig = UsageInsightsPriceConfig & {
  /** Prices inside a configured peak window; absent means the fallback is flat-priced. */
  readonly peak?: UsageInsightsPriceConfig
}

/** Plugin configuration; every field has a default, so the plugin mounts bare. */
export interface UsageInsightsConfig {
  /** Currency every cost figure is expressed in; the plugin performs no conversion. */
  currency: string
  /** Configured rate cards, matched in order. */
  models: UsageInsightsModelConfig[]
  /** Card used by a route no model matches. */
  fallback: UsageInsightsFallbackConfig
  /** Peak windows as `HH:MM-HH:MM` in Beijing time. */
  peakWindows: string[]
  /** When true, Saturday and Sunday are never peak. */
  peakWeekdaysOnly: boolean
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
  warmup: boolean
  /** How long after activation the background fold starts, in milliseconds. */
  warmupDelayMs: number
}

/**
 * The shipped cards, in CNY per one million tokens.
 *
 * The numbers are the operator's collected list prices (2026-10-20) for the
 * models this panel sees. They are stated as published: where a list has no
 * per-token cache-write price the write bucket is 0 rather than a repeated miss
 * price, because a repeated price would claim a charge the vendor does not make.
 * The two DeepSeek Flash cards differ only in the write price the list states.
 */

/** `deepseek-v4.1-flash`, off-peak and peak. The list states a cache-write price. */
const V41_FLASH_RATE: UsageInsightsPriceConfig = { input: 1, cacheRead: 0.02, cacheWrite: 2.5, output: 4 }
/** The same model inside its peak windows; stated, not derived from the off-peak card. */
const V41_FLASH_PEAK: UsageInsightsPriceConfig = { input: 2, cacheRead: 0.04, cacheWrite: 2.5, output: 8 }

/**
 * `deepseek-flash` — the model's API name — and `deepseek-v4-flash`, the name it
 * was routed under before the rename: one card, and no cache-write price listed.
 */
const FLASH_RATE: UsageInsightsPriceConfig = { input: 1, cacheRead: 0.02, cacheWrite: 0, output: 4 }
/** The same card inside its peak windows. */
const FLASH_PEAK: UsageInsightsPriceConfig = { input: 2, cacheRead: 0.04, cacheWrite: 0, output: 8 }

/** `deepseek-v4-pro`, the larger DeepSeek card, off-peak and peak. */
const PRO_RATE: UsageInsightsPriceConfig = { input: 4.5, cacheRead: 0.15, cacheWrite: 4.5, output: 13.5 }
/** The same card inside its peak windows. */
const PRO_PEAK: UsageInsightsPriceConfig = { input: 9, cacheRead: 0.3, cacheWrite: 9, output: 27 }

/**
 * Shipped defaults: one card per model, matched against the routed model first by
 * identity and then by substring, in the order listed.
 *
 * A route served through an aggregator or a reseller has to be priced by the
 * operator, and the panel names every route that fell back to the default rather
 * than implying a figure it cannot support. `kimi-k3-1` states the 5-minute
 * cache-write tier; the list's 1-hour tier (40) has no field of its own here.
 */
export const DEFAULT_CONFIG: UsageInsightsConfig = {
  currency: 'CNY',
  models: [
    { match: 'deepseek-v4.1-flash', ...V41_FLASH_RATE, peak: V41_FLASH_PEAK },
    // The peak windows are DeepSeek's: Beijing 09:00–12:00 and 14:00–18:00, weekdays.
    { match: 'deepseek-v4-pro', ...PRO_RATE, peak: PRO_PEAK },
    { match: 'deepseek-flash', ...FLASH_RATE, peak: FLASH_PEAK },
    { match: 'deepseek-v4-flash', ...FLASH_RATE, peak: FLASH_PEAK },
    { match: 'glm-5.3-flash', input: 0.8, cacheRead: 0.23, cacheWrite: 0.95, output: 2.8 },
    { match: 'gpt-5.6-sol', input: 28.8, cacheRead: 2.88, cacheWrite: 36, output: 144 },
    { match: 'grok-4.6', input: 14.4, cacheRead: 3.6, cacheWrite: 0, output: 43.2 },
    { match: 'kimi-k3-1', input: 20, cacheRead: 2, cacheWrite: 20, output: 100 },
    { match: 'kimi-k2.8-preview', input: 6.5, cacheRead: 1.7, cacheWrite: 6.5, output: 27 },
  ],
  fallback: { ...FLASH_RATE, peak: FLASH_PEAK },
  peakWindows: ['09:00-12:00', '14:00-18:00'],
  peakWeekdaysOnly: true,
  warmup: true,
  // Long enough that the fold does not compete with the rest of the boot, short
  // enough that it is usually done before the reader opens the panel.
  warmupDelayMs: 4_000,
}

export function resolveConfig(config: UsageInsightsConfig): UsageInsightsConfig {
  return {
    currency: config.currency ?? DEFAULT_CONFIG.currency,
    models: config.models ?? DEFAULT_CONFIG.models,
    fallback: config.fallback ?? DEFAULT_CONFIG.fallback,
    peakWindows: config.peakWindows ?? DEFAULT_CONFIG.peakWindows,
    peakWeekdaysOnly: config.peakWeekdaysOnly ?? DEFAULT_CONFIG.peakWeekdaysOnly,
    warmup: config.warmup ?? DEFAULT_CONFIG.warmup,
    warmupDelayMs: config.warmupDelayMs ?? DEFAULT_CONFIG.warmupDelayMs,
  }
}

/** One configured card as the pricing engine reads it. */
function cardOf(
  config: UsageInsightsPriceConfig & { readonly peak?: UsageInsightsPriceConfig },
  match: string,
): ModelPrice {
  const offPeak: PriceRate = {
    input: config.input,
    cacheRead: config.cacheRead,
    cacheWrite: config.cacheWrite,
    output: config.output,
  }
  return config.peak === undefined
    ? { match, peakEnabled: false, peak: { ...offPeak }, offPeak }
    : { match, peakEnabled: true, peak: { ...config.peak }, offPeak }
}

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
export function pricingOptions(config: UsageInsightsConfig, rates: RateStore): PricingOptions {
  const windows: PeakWindow[] = []
  for (const spec of config.peakWindows) {
    const window = parsePeakWindow(spec)
    if (window !== undefined) windows.push(window)
  }
  const edits = rates.read()
  const models: ModelPrice[] = config.models.map(model => {
    const card = cardOf(model, model.match)
    const edit = edits.get(card.match)
    // A route-scoped edit is not a model edit even if its route string happens
    // to equal a card's match; it is appended below with its own scope.
    return edit === undefined || edit.route !== undefined ? card : { match: card.match, ...edit }
  })
  // An edit for a model the configuration does not name is still an edit, and it
  // claims its own routes: this is what makes a migrated per-route price take
  // effect, and what lets a reader price a model that ships without a card.
  const named = new Set(models.map(card => card.match))
  for (const [match, edit] of edits) {
    if (match.length === 0) continue
    if (edit.route !== undefined) {
      // A migrated row keeps its route scope and is checked before model rules.
      models.push({ match: edit.route, route: edit.route, ...edit })
    } else if (!named.has(match)) {
      models.push({ match, ...edit })
    }
  }
  const configured = cardOf(config.fallback, '')
  const fallbackEdit = edits.get('')
  const fallback: ModelPrice = fallbackEdit === undefined
    ? configured
    : { match: '', ...fallbackEdit }
  return {
    currency: config.currency,
    models,
    fallback,
    peakWindows: windows,
    peakWeekdaysOnly: config.peakWeekdaysOnly,
  }
}
