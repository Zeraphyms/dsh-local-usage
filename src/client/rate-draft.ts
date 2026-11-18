/**
 * Editing the model price cards.
 *
 * The editor holds text fields, not numbers: a reader clearing one to fall back
 * to the value in effect is a real intention, and a number input cannot tell
 * "empty" from "zero". The drafts are therefore strings until the moment they
 * become an update, and this module owns that translation — which cards actually
 * changed, which fields hold something that is not a price, and which set of
 * prices a field belongs to.
 *
 * A card is a model, not a route: editing one changes every route that model is
 * sold under, which is the point of pricing by model. Consumption stays per route
 * and is not edited here at all.
 *
 * @module dsh-local-usage/client/rate-draft
 */

import type { UsageModelEdit, UsageModelPrice, UsagePricingUpdate, UsageRate, UsagePriceCurrency } from '../types.ts'

/** One set of four price fields, as typed. */
export interface PriceFields {
  input: string
  cacheRead: string
  cacheWrite: string
  output: string
}

/** One model's draft: its rule, the switch, and both sets of prices. */
export interface ModelDraft {
  /** The match rule as typed; seeded from the card in effect. */
  match: string
  /** Input unit; omitted means the stored CNY unit. */
  currency?: UsagePriceCurrency
  /** The unit the seeded fields were rendered in; conversion uses this pair. */
  seededCurrency?: UsagePriceCurrency
  /** The unit the card's own prices are stored in. */
  storedCurrency?: UsagePriceCurrency
  /** CNY per USD captured when the input unit changes. */
  exchangeRate?: number
  /** Whether the model prices peak separately. */
  peakEnabled: boolean
  /** Prices inside a peak window; ignored while {@link peakEnabled} is false. */
  peak: PriceFields
  /** Prices outside one, or the flat price when {@link peakEnabled} is false. */
  offPeak: PriceFields
}

/** Every model's draft, keyed by the card's `match`. */
export type ModelDrafts = Record<string, ModelDraft>

/** The four buckets, in the order the editor writes them. */
export const RATE_FIELDS = ['input', 'cacheRead', 'cacheWrite', 'output'] as const

/**
 * A price set reduced to what tells two configurations apart.
 *
 * The editor re-seeds its drafts when the cards in effect change, and the cards
 * are rebuilt on every render of the page; this is the string it compares, so a
 * render that changed nothing does not overwrite what is being typed.
 * @param rate - one set of four prices.
 * @returns the four prices as a stable signature.
 */
export function rateSignature(rate: UsageRate): string {
  return RATE_FIELDS.map(field => String(rate[field])).join(',')
}

/** One bucket of one card. */
export type RateField = typeof RATE_FIELDS[number]

/** Which of a card's two sets of prices a field belongs to. */
export type PriceSet = 'peak' | 'offPeak'

/** What one set of drafts amounts to. */
export type RateDraftResult =
  /** Nothing to write: every card already matches the prices in effect. */
  | { readonly status: 'empty' }
  /** A field holds text that is not a price; names the card, the set and the field. */
  | {
    readonly status: 'invalid'
    readonly model: string
    readonly set: PriceSet
    readonly field: RateField
  }
  /**
   * The typed match rule cannot become a card: it is empty, or another card
   * already claims it. Names the open card and why the rule was refused.
   */
  | {
    readonly status: 'invalid-match'
    readonly model: string
    readonly reason: 'empty' | 'duplicate'
  }
  /** A write to send. */
  | { readonly status: 'ready'; readonly update: UsagePricingUpdate }

/** Render one number the way an editable field shows it. */
function draftOf(value: number): string {
  return Number.isFinite(value) ? String(value) : ''
}

/** The four fields of one set, as the editor shows them. */
function fieldsOf(rate: UsageRate): PriceFields {
  return {
    input: draftOf(rate.input),
    cacheRead: draftOf(rate.cacheRead),
    cacheWrite: draftOf(rate.cacheWrite),
    output: draftOf(rate.output),
  }
}

/**
 * The drafts an editor opens on: one per card, pre-filled with what is in effect.
 * @param models - the cards the report published, in match order.
 * @returns one draft per card, keyed by `match`.
 */
export function draftsFrom(models: readonly UsageModelPrice[]): ModelDrafts {
  const drafts: ModelDrafts = {}
  for (const card of models) {
    drafts[card.match] = {
      match: card.match,
      // A card stored in USD opens in USD, so the reader sees what was typed.
      ...card.currency === undefined ? {} : { currency: card.currency, seededCurrency: card.currency, storedCurrency: card.currency },
      peakEnabled: card.peakEnabled,
      peak: fieldsOf(card.peak),
      offPeak: fieldsOf(card.offPeak),
    }
  }
  return drafts
}

/** Parse one field: `undefined` for blank, `null` for text that is not a price. */
function readField(text: string): number | undefined | null {
  const trimmed = text.trim()
  if (trimmed.length === 0) return undefined
  const value = Number(trimmed)
  return Number.isFinite(value) && value >= 0 ? value : null
}

/** Whether every field of one set is blank. */
function isBlank(fields: PriceFields): boolean {
  return RATE_FIELDS.every(field => fields[field].trim().length === 0)
}

/** Whether two sets state the same four prices. */
function samePrices(left: UsageRate, right: UsageRate): boolean {
  return RATE_FIELDS.every(field => left[field] === right[field])
}

/**
 * Turn one set of drafts into the write it implies.
 *
 * A card is written only when it differs from what is in effect, so the table
 * never fills with edits that merely restate the configuration. Blank fields are
 * completed from the value in effect rather than rejected — a reader editing only
 * the output price means the other three as they stand — and a card whose fields
 * are all blank asks for the reader's edit to be dropped, returning the model to
 * its configured prices.
 *
 * @param drafts - the fields as typed.
 * @param models - the cards and the prices currently in effect.
 * @param only - when given, the one model the open editor is saving; other
 *   drafts are left alone even when they differ or are invalid.
 * @returns nothing to do, the first invalid field, or the update to send.
 */
export function pendingUpdate(
  drafts: ModelDrafts,
  models: readonly UsageModelPrice[],
  only?: string,
): RateDraftResult {
  const writes: Record<string, UsageModelEdit | null> = {}
  const selected = only === undefined ? models : models.filter(card => card.match === only)
  let currency: UsagePriceCurrency = 'CNY'

  for (const card of selected) {
    const draft = drafts[card.match]
    if (draft === undefined) continue

    currency = draft.currency ?? 'CNY'

    // A typed rule that differs from the card's own moves the card: the new
    // rule claims the prices, and the old rule is released. The fallback card
    // has no rule of its own to move, so it keeps the drop-only semantics.
    const typedMatch = draft.match.trim()
    const renamed = card.match !== '' && typedMatch !== card.match
    if (renamed) {
      if (typedMatch.length === 0) {
        return { status: 'invalid-match', model: card.match, reason: 'empty' }
      }
      // The target must be free both among the cards in effect and among the
      // moves an earlier card in this same save has already claimed.
      const taken = models.some(candidate => candidate.match === typedMatch)
        || Object.hasOwn(writes, typedMatch)
      if (taken) {
        return { status: 'invalid-match', model: card.match, reason: 'duplicate' }
      }
    }

    // A card blanked on both sets asks for the edit to be dropped. With the
    // switch off, the peak set is not read at all, so only the flat set counts.
    const blankBoth = isBlank(draft.offPeak) && isBlank(draft.peak)
    if (blankBoth && !renamed) {
      writes[card.match] = null
      continue
    }

    // The typed fields are in the draft's view unit; the seeded blanks are in
    // the seeded unit. Convert only across that pair — never client-side from
    // USD to CNY for submission, because the Host stores the typed unit.
    // The typed fields are in the draft's view unit; the seeded blanks are in
    // the card's stored unit. Blanks convert stored→view so a USD view of a CNY
    // card completes in USD. The submission stays in the view unit; the Host
    // stores it typed and converts to the report currency at pricing time.
    const stored = draft.storedCurrency ?? 'CNY'
    const view = (rate: UsageRate): UsageRate => {
      if (stored === currency) return rate
      const factor = currency === 'USD' ? 1 / (draft.exchangeRate ?? 1) : draft.exchangeRate ?? 1
      return {
        input: Number((rate.input * factor).toPrecision(15)),
        cacheRead: Number((rate.cacheRead * factor).toPrecision(15)),
        cacheWrite: Number((rate.cacheWrite * factor).toPrecision(15)),
        output: Number((rate.output * factor).toPrecision(15)),
      }
    }
    const offPeak = resolve(draft.offPeak, view(card.offPeak))
    if ('field' in offPeak) {
      return { status: 'invalid', model: card.match, set: 'offPeak', field: offPeak.field }
    }
    // The peak set only matters while the switch is on; a flat model keeps
    // whatever peak prices it carries rather than validating fields it ignores.
    let peak: UsageRate = view(card.peak)
    if (draft.peakEnabled) {
      const read = resolve(draft.peak, view(card.peak))
      if ('field' in read) {
        return { status: 'invalid', model: card.match, set: 'peak', field: read.field }
      }
      peak = read.rate
    }

    const next: UsageModelEdit = {
      ...card.route === undefined ? {} : { route: card.route },
      // The typed unit rides with the card, so the sheet shows what was written
      // and the fold converts to the report currency at pricing time.
      ...currency === 'USD' ? { currency } : {},
      peakEnabled: draft.peakEnabled,
      peak,
      offPeak: offPeak.rate,
    }
    const unchanged = !renamed
      && next.peakEnabled === card.peakEnabled
      && samePrices(next.offPeak, view(card.offPeak))
      && samePrices(next.peak, view(card.peak))
    if (!unchanged) {
      // A rename always writes, even with every price left as it stands: the
      // move itself is the change the reader asked for.
      if (renamed) writes[card.match] = null
      writes[typedMatch] = next
    }
  }

  return Object.keys(writes).length === 0
    ? { status: 'empty' }
    : { status: 'ready', update: { models: writes } }
}

/**
 * Read one set of fields, completing blanks from the prices in effect.
 * @param fields - the four fields as typed.
 * @param effective - the prices those fields stand for when left blank.
 * @returns either the four prices or the first field that is not one.
 */
function resolve(fields: PriceFields, effective: UsageRate): { rate: UsageRate } | { field: RateField } {
  const rate: Record<RateField, number> = {
    input: effective.input,
    cacheRead: effective.cacheRead,
    cacheWrite: effective.cacheWrite,
    output: effective.output,
  }
  for (const field of RATE_FIELDS) {
    const value = readField(fields[field])
    if (value === null) return { field }
    if (value !== undefined) rate[field] = value
  }
  return { rate }
}
