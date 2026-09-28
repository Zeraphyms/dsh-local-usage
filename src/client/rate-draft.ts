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

import type { UsagePricingUpdate, UsageRate, UsageRouteRate } from '../types.ts'

/** The four fields of one route's row, as typed. */
export interface RateDraft {
  input: string
  cacheRead: string
  cacheWrite: string
  output: string
}

/** Every row's draft, keyed by exact route. */
export type RateDrafts = Record<string, RateDraft>

/** The four buckets, in the order the editor writes them. */
export const RATE_FIELDS = ['input', 'cacheRead', 'cacheWrite', 'output'] as const

/** One field of one route's row. */
export type RateField = typeof RATE_FIELDS[number]

/** What one set of drafts amounts to. */
export type RateDraftResult =
  /** Nothing to write: every row already matches the rate in effect. */
  | { readonly status: 'empty' }
  /** A row holds text that is not a price; `route` and `field` name it. */
  | { readonly status: 'invalid'; readonly route: string; readonly field: RateField }
  /** A write to send. */
  | { readonly status: 'ready'; readonly update: UsagePricingUpdate }

/** Render one number the way an editable field shows it. */
function draftOf(value: number): string {
  return Number.isFinite(value) ? String(value) : ''
}

/**
 * The drafts an editor opens on: every route, pre-filled with the rate in effect.
 * @param routes - the routes the window recorded, with their rates.
 * @returns one draft per route.
 */
export function draftsFrom(routes: readonly UsageRouteRate[]): RateDrafts {
  const drafts: RateDrafts = {}
  for (const entry of routes) {
    drafts[entry.route] = {
      input: draftOf(entry.rate.input),
      cacheRead: draftOf(entry.rate.cacheRead),
      cacheWrite: draftOf(entry.rate.cacheWrite),
      output: draftOf(entry.rate.output),
    }
  }
  return drafts
}

/** Parse one draft field. */
function readField(draft: RateDraft, field: RateField): number | undefined | null {
  const text = draft[field].trim()
  // Empty means "no override here", which is not the same as zero.
  if (text.length === 0) return undefined
  const value = Number(text)
  return Number.isFinite(value) && value >= 0 ? value : null
}

/** Whether every field of a row is blank. */
function isEmptyRow(draft: RateDraft): boolean {
  return RATE_FIELDS.every(field => draft[field].trim().length === 0)
}

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
export function pendingUpdate(
  drafts: RateDrafts,
  routes: readonly UsageRouteRate[],
): RateDraftResult {
  const set: Record<string, UsageRate | null> = {}

  for (const entry of routes) {
    const draft = drafts[entry.route]
    if (draft === undefined) continue

    if (isEmptyRow(draft)) {
      // A blank row on an override is a request to drop it; a blank row on a
      // rule or the fallback asks for nothing, because there is nothing to drop.
      if (entry.source === 'override') set[entry.route] = null
      continue
    }

    const parsed: Record<RateField, number | undefined> = {
      input: undefined, cacheRead: undefined, cacheWrite: undefined, output: undefined,
    }
    for (const field of RATE_FIELDS) {
      const value = readField(draft, field)
      if (value === null) return { status: 'invalid', route: entry.route, field }
      // A partially filled row is completed from the rate in effect rather than
      // rejected: the reader editing only the output price means the rest as-is.
      parsed[field] = value ?? entry.rate[field]
    }

    const rate: UsageRate = {
      input: parsed.input as number,
      cacheRead: parsed.cacheRead as number,
      cacheWrite: parsed.cacheWrite as number,
      output: parsed.output as number,
    }
    // Only a difference is worth persisting: a row left alone keeps its rule, so
    // the table never fills with overrides that merely restate the configuration.
    const unchanged = RATE_FIELDS.every(field => rate[field] === entry.rate[field])
    if (!unchanged) set[entry.route] = rate
  }

  return Object.keys(set).length === 0 ? { status: 'empty' } : { status: 'ready', update: { set } }
}
