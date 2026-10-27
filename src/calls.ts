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

import type { PricingOptions, SessionUsageInput } from './aggregate.ts'
import { modelKey, modelOf } from './model-name.ts'
import { beijingClock, costOf, isPeakClock, selectRate } from './pricing.ts'
import { UNKNOWN_PROJECT } from './types.ts'
import type {
  UsageCallFacet,
  UsageCallRow,
  UsageCallsQuery,
  UsageCallsReport,
  UsageCosted,
  UsageProjectFacet,
  UsageSessionFacet,
  UsageTokens,
} from './types.ts'

/** Page size when the reader asks for none. */
const DEFAULT_LIMIT = 50

/** Largest page a caller may ask for; a page beyond this is a table nobody reads. */
const MAX_LIMIT = 200

/** Facts about the read behind one query, repeated onto its answer. */
export interface CallsMeta {
  /** Host clock when the answer was cut. */
  readonly generatedAt: number
  /** Sessions the time window was folded from. */
  readonly scannedSessions: number
  /** Sessions that could not be read. */
  readonly unreadableSessions: number
  /** Whether the fold came from the Host's cache rather than a fresh read. */
  readonly cached: boolean
}

/** Tokens, money and calls accumulated over a set of rows. */
interface Bucket {
  uncachedInputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  cost: number
  calls: number
}

/** One route's facet while it is being accumulated. */
interface FacetBucket extends Bucket {
  readonly route: string
  readonly model: string
  readonly provider: string
}

/** A bucket with every figure at zero. */
function emptyBucket(): Bucket {
  return {
    uncachedInputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    cost: 0,
    calls: 0,
  }
}

/** Add one priced settlement to a bucket. */
function addTo(bucket: Bucket, tokens: UsageTokens, cost: number): void {
  bucket.uncachedInputTokens += tokens.uncachedInputTokens
  bucket.outputTokens += tokens.outputTokens
  bucket.cacheReadTokens += tokens.cacheReadTokens
  bucket.cacheWriteTokens += tokens.cacheWriteTokens
  bucket.cost += cost
  bucket.calls += 1
}

/** All tokens of one bucket. */
function tokensOf(bucket: Bucket): number {
  return bucket.uncachedInputTokens + bucket.outputTokens
    + bucket.cacheReadTokens + bucket.cacheWriteTokens
}

/** A bucket as the wire states it, without the internal call count of a facet. */
function costedOf(bucket: Bucket): UsageCosted {
  return {
    uncachedInputTokens: bucket.uncachedInputTokens,
    outputTokens: bucket.outputTokens,
    cacheReadTokens: bucket.cacheReadTokens,
    cacheWriteTokens: bucket.cacheWriteTokens,
    cost: bucket.cost,
    calls: bucket.calls,
  }
}

/** The provider segment of a route, or the route itself when it has none. */
function providerOf(route: string): string {
  const slash = route.indexOf('/')
  return slash > 0 ? route.slice(0, slash) : route
}

/**
 * Clamp one integer query field.
 * @param value - the caller's value, when it is a number.
 * @param fallback - value used when it is absent or not finite.
 * @param min - smallest accepted value.
 * @param max - largest accepted value.
 * @returns the clamped integer.
 */
function clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value)))
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
export function queryCalls(
  inputs: readonly SessionUsageInput[],
  options: PricingOptions,
  query: UsageCallsQuery,
  meta: CallsMeta,
): UsageCallsReport {
  const rows: UsageCallRow[] = []
  const totals = emptyBucket()
  const facets = new Map<string, FacetBucket>()
  const sessionFacets = new Map<string, { sessionId: string; title?: string; calls: number; cost: number }>()
  const projectFacets = new Map<string, { path: string; calls: number; cost: number }>()
  const sessions = new Set<string>()
  const projects = new Set<string>()
  const modelNeedle = query.model === undefined || query.model.length === 0
    ? undefined
    : modelKey(query.model)
  const routeNeedle = query.route === undefined || query.route.length === 0
    ? undefined
    : query.route
  const sessionNeedle = query.session === undefined || query.session.length === 0
    ? undefined
    : query.session
  const projectNeedle = query.project === undefined || query.project.length === 0
    ? undefined
    : query.project
  const textNeedle = query.q === undefined ? '' : query.q.trim().toLowerCase()

  for (const input of inputs) {
    const project = input.cwd ?? UNKNOWN_PROJECT
    // The part of the search haystack that does not change per sample. Built
    // once per session rather than once per call: a session with a thousand
    // settlements would otherwise lowercase the same title a thousand times.
    const sessionText = [
      input.title ?? '',
      input.cwd ?? '',
      input.sessionId,
    ].join('\n').toLowerCase()

    for (let index = 0; index < input.samples.length; index += 1) {
      const sample = input.samples[index]
      if (sample === undefined) continue
      // The caller normally hands over samples already reduced to the window,
      // but the query states its own bounds: applying them here as well keeps a
      // direct caller — a test, or a future route that hands over whole folds —
      // from reading a figure the window excludes.
      if (query.from !== undefined && sample.time < query.from) continue
      if (query.to !== undefined && sample.time > query.to) continue
      const clock = beijingClock(sample.time)
      const peak = isPeakClock(clock, options.peakWindows, options.peakWeekdaysOnly)
      const { rate, matched } = selectRate(options.models, options.fallback, sample.route, peak)
      const cost = costOf(sample.tokens, rate)
      const model = modelOf(sample.route)

      // Facets describe the time window, not the other filters: a reader who has
      // narrowed to one model must still see every model they can switch to.
      let facet = facets.get(sample.route)
      if (facet === undefined) {
        facet = {
          ...emptyBucket(),
          route: sample.route,
          model,
          provider: providerOf(sample.route),
        }
        facets.set(sample.route, facet)
      }
      addTo(facet, sample.tokens, cost)

      // The session and project facets see the window, not the filters — same
      // rule as the route facets above, so no picker narrows its own choices.
      let sessionFacet = sessionFacets.get(input.sessionId)
      if (sessionFacet === undefined) {
        sessionFacet = {
          sessionId: input.sessionId,
          ...input.title === undefined ? {} : { title: input.title },
          calls: 0,
          cost: 0,
        }
        sessionFacets.set(input.sessionId, sessionFacet)
      }
      sessionFacet.calls += 1
      sessionFacet.cost += cost
      let projectFacet = projectFacets.get(project)
      if (projectFacet === undefined) {
        projectFacet = { path: project, calls: 0, cost: 0 }
        projectFacets.set(project, projectFacet)
      }
      projectFacet.calls += 1
      projectFacet.cost += cost

      if (routeNeedle !== undefined && sample.route !== routeNeedle) continue
      if (modelNeedle !== undefined && modelKey(model) !== modelNeedle) continue
      if (sessionNeedle !== undefined && input.sessionId !== sessionNeedle) continue
      if (projectNeedle !== undefined && project !== projectNeedle) continue
      if (textNeedle.length > 0
        && !sessionText.includes(textNeedle)
        && !sample.route.toLowerCase().includes(textNeedle)) continue

      addTo(totals, sample.tokens, cost)
      sessions.add(input.sessionId)
      projects.add(project)
      rows.push({
        id: `${input.sessionId}:${String(index)}`,
        time: sample.time,
        ...sample.turn === undefined ? {} : { turn: sample.turn },
        ...sample.step === undefined ? {} : { step: sample.step },
        sessionId: input.sessionId,
        ...input.title === undefined ? {} : { title: input.title },
        ...input.cwd === undefined ? {} : { cwd: input.cwd },
        route: sample.route,
        model,
        provider: providerOf(sample.route),
        tokens: sample.tokens,
        ...sample.firstTokenMs === undefined ? {} : { firstTokenMs: sample.firstTokenMs },
        ...sample.durationMs === undefined ? {} : { durationMs: sample.durationMs },
        ...sample.outputTps === undefined ? {} : { outputTps: sample.outputTps },
        cost,
        priced: matched,
      })
    }
  }

  /** The ordering value of one row for the requested sort column. */
  const metricOf = (row: UsageCallRow): number => {
    switch (query.sort) {
      case 'cost': return row.cost
      case 'tokens':
        return row.tokens.uncachedInputTokens + row.tokens.outputTokens
          + row.tokens.cacheReadTokens + row.tokens.cacheWriteTokens
      case 'output': return row.tokens.outputTokens
      default: return row.time
    }
  }
  const direction = query.dir === 'asc' ? 1 : -1
  rows.sort((left, right) => {
    const difference = metricOf(left) - metricOf(right)
    if (difference !== 0) return difference * direction
    // A deterministic tail: the same query must answer the same page twice, and
    // two settlements of one session can share every figure and even the instant.
    if (left.time !== right.time) return right.time - left.time
    if (left.sessionId !== right.sessionId) return left.sessionId < right.sessionId ? -1 : 1
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  })

  const limit = clampInteger(query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
  const offset = clampInteger(query.offset, 0, 0, Number.MAX_SAFE_INTEGER)
  const routes: UsageCallFacet[] = [...facets.values()]
    .map(facet => ({
      route: facet.route,
      model: facet.model,
      provider: facet.provider,
      calls: facet.calls,
      tokens: tokensOf(facet),
      cost: facet.cost,
    }))
    .sort((left, right) => right.calls - left.calls || right.cost - left.cost
      || left.route.localeCompare(right.route))

  // Dearest first, then by title so the picker's order is stable across pages.
  const sessionFacetRows: UsageSessionFacet[] = [...sessionFacets.values()]
    .map(facet => ({
      sessionId: facet.sessionId,
      ...facet.title === undefined ? {} : { title: facet.title },
      calls: facet.calls,
      cost: facet.cost,
    }))
    .sort((left, right) => right.cost - left.cost
      || (left.title ?? '').localeCompare(right.title ?? '')
      || left.sessionId.localeCompare(right.sessionId))

  const projectFacetRows: UsageProjectFacet[] = [...projectFacets.values()]
    .map(facet => ({ ...facet }))
    .sort((left, right) => right.cost - left.cost || left.path.localeCompare(right.path))

  return {
    generatedAt: meta.generatedAt,
    currency: options.currency,
    rows: rows.slice(offset, offset + limit),
    total: rows.length,
    offset,
    limit,
    totals: costedOf(totals),
    routes,
    sessionFacets: sessionFacetRows,
    projectFacets: projectFacetRows,
    sessions: sessions.size,
    projects: projects.size,
    scannedSessions: meta.scannedSessions,
    unreadableSessions: meta.unreadableSessions,
    cached: meta.cached,
  }
}
