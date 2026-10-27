/**
 * Normalize one call-log page as it arrives from the Host.
 *
 * The browser bundle is served from disk and swapped live while the Host half
 * only changes on a restart, so a freshly built Client can ask a Host that has
 * never heard of `/calls` — or an older build that answers with a subset of the
 * fields. Every missing figure is filled with a safe zero here, once, so the
 * table stays total over the declared report shape and a version skew costs the
 * reader a column rather than the page.
 *
 * @module dsh-local-usage/client/wire-calls
 */

import type { UsageCallRow, UsageCallsReport, UsageTokens } from '../types.ts'

/** Read one token bucket, filling fields a Host of another build may omit. */
function tokensOf(value: Partial<UsageTokens> | undefined): UsageTokens {
  return {
    uncachedInputTokens: value?.uncachedInputTokens ?? 0,
    outputTokens: value?.outputTokens ?? 0,
    cacheReadTokens: value?.cacheReadTokens ?? 0,
    cacheWriteTokens: value?.cacheWriteTokens ?? 0,
  }
}

/** Read one row, filling the buckets it may have arrived without. */
function rowOf(value: UsageCallRow): UsageCallRow {
  return { ...value, tokens: tokensOf(value.tokens) }
}

/**
 * Fill every field the call table reads with a safe default.
 * @param value - the page as received.
 * @returns a page whose declared fields are all present.
 */
export function normalizeCallsReport(value: Partial<UsageCallsReport>): UsageCallsReport {
  const totals = value.totals
  return {
    generatedAt: value.generatedAt ?? 0,
    currency: value.currency ?? 'CNY',
    rows: (value.rows ?? []).map(rowOf),
    total: value.total ?? 0,
    offset: value.offset ?? 0,
    limit: value.limit ?? 50,
    totals: {
      uncachedInputTokens: totals?.uncachedInputTokens ?? 0,
      outputTokens: totals?.outputTokens ?? 0,
      cacheReadTokens: totals?.cacheReadTokens ?? 0,
      cacheWriteTokens: totals?.cacheWriteTokens ?? 0,
      cost: totals?.cost ?? 0,
      calls: totals?.calls ?? 0,
    },
    routes: value.routes ?? [],
    sessionFacets: value.sessionFacets ?? [],
    projectFacets: value.projectFacets ?? [],
    sessions: value.sessions ?? 0,
    projects: value.projects ?? 0,
    scannedSessions: value.scannedSessions ?? 0,
    unreadableSessions: value.unreadableSessions ?? 0,
    cached: value.cached ?? false,
  }
}
