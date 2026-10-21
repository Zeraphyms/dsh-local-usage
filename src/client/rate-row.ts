/**
 * One row of the price sheet: the card in effect, its volume, and what it cost.
 *
 * Kept apart from the editor so the group component and the page can name the
 * same row without importing each other.
 *
 * @module dsh-local-usage/client/rate-row
 */

import type { UsageModelPrice } from '../types.ts'
import type { RateField } from './rate-draft.ts'

/** One row of the price sheet: a model, what it spent, and the rates it is on. */
export interface RateRow {
  /** The card that prices the model — configured, edited, or the fallback's. */
  readonly card: UsageModelPrice
  /** The model spelling to show, when the card's own match is a substring rule. */
  readonly name?: string
  /** Tokens the model spent in the window. */
  readonly tokens: number
  /** How many routes of the model the window recorded. */
  readonly routes: number
  /** What the model cost over the window, shown beside its volume. */
  readonly cost: number
  /**
   * Whether a card of its own prices the model, or the default rate does.
   *
   * A row that inherits the default is not stating this model's price — it is
   * stating the price that will be used until someone writes one — and a table
   * that shows the two identically is telling the reader something untrue.
   */
  readonly inherited: boolean
}


/** The dictionary key of each bucket's column label. */
export const FIELD_KEYS: Record<RateField, 'pricingColumnInput' | 'pricingColumnCacheRead' | 'pricingColumnCacheWrite' | 'pricingColumnOutput'> = {
  input: 'pricingColumnInput',
  cacheRead: 'pricingColumnCacheRead',
  cacheWrite: 'pricingColumnCacheWrite',
  output: 'pricingColumnOutput',
}
