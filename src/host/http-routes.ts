/**
 * The HTTP surface: query parsing, status codes, JSON answers, and the route
 * registration that mounts the report, the call log, progress and the rate table.
 *
 * This module is the only place that knows an HTTP `Request` exists. The service
 * above it takes windows and queries; the reader takes a corpus. Keeping the
 * translation here is what lets the entry read as activation wiring.
 *
 * @module dsh-local-usage/host/http-routes
 */

import type { Context } from '@deepseek-ai/cordis'
import type { FoldCache } from '../fold-cache.ts'
import type { ProgressTracker } from '../progress.ts'
import { readModelEdit } from '../rates.ts'
import type { RateStore } from '../rates.ts'
import type {
  UsageCallSort,
  UsageCallsQuery,
  UsageModelEdit,
  UsagePricingUpdate,
} from '../types.ts'
import type { UsageInsightsConfig } from './config.ts'
import { CALLS_PATH, PRICING_PATH, PROGRESS_PATH, REPORT_PATH } from './routes.ts'
import type { CachedSession } from './session-fold.ts'
import { assembleReport, queryCallPage } from './usage-service.ts'

/** Runs one corpus read after every read queued before it has settled. */
export type SerializedRead = <T>(task: () => Promise<T>) => Promise<T>

/** Parse one optional finite query parameter. */
function numberParam(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key)
  if (raw === null) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

/** Parse one optional text query parameter, bounded so a URL cannot carry a page of prose. */
function textParam(params: URLSearchParams, key: string, maxLength: number): string | undefined {
  const raw = params.get(key)
  if (raw === null) return undefined
  const value = raw.trim()
  return value.length === 0 ? undefined : value.slice(0, maxLength)
}

/** The sort columns the call log understands, so a typo falls back to the default. */
const CALL_SORTS: readonly UsageCallSort[] = ['time', 'cost', 'tokens', 'output']

/** Read one call-log query off an untrusted URL. */
function callsQueryOf(params: URLSearchParams): UsageCallsQuery {
  const rawSort = params.get('sort')
  const sort = CALL_SORTS.find(candidate => candidate === rawSort) ?? 'time'
  const from = numberParam(params, 'from')
  const to = numberParam(params, 'to')
  const route = textParam(params, 'route', 200)
  const model = textParam(params, 'model', 120)
  const session = textParam(params, 'session', 200)
  const q = textParam(params, 'q', 200)
  const offset = numberParam(params, 'offset')
  const limit = numberParam(params, 'limit')
  return {
    ...from === undefined ? {} : { from },
    ...to === undefined ? {} : { to },
    ...route === undefined ? {} : { route },
    ...model === undefined ? {} : { model },
    ...session === undefined ? {} : { session },
    ...q === undefined ? {} : { q },
    sort,
    dir: params.get('dir') === 'asc' ? 'asc' : 'desc',
    ...offset === undefined ? {} : { offset },
    ...limit === undefined ? {} : { limit },
  }
}

/** One line describing an error, for a log line. */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Answer one call-log page with JSON, or a described failure. */
async function handleCalls(
  ctx: Context,
  cache: Map<string, CachedSession>,
  folds: FoldCache,
  progress: ProgressTracker,
  config: UsageInsightsConfig,
  rates: RateStore,
  serialize: SerializedRead,
  generations: ReadonlyMap<string, number>,
  request: Request,
  background: () => Promise<void> | undefined,
): Promise<Response> {
  const url = new URL(request.url)
  const query = callsQueryOf(url.searchParams)
  const headers = { 'cache-control': 'no-store' }
  try {
    // The same rule as the report: a background fold already reading this
    // corpus is the work this request needs, so wait for it instead of starting
    // a second walk over every log.
    const pending = background()
    if (pending !== undefined) await pending
    const page = await serialize(() => queryCallPage(
      ctx,
      cache,
      folds,
      progress,
      config,
      rates,
      query,
      generations,
      url.searchParams.get('refresh') === '1',
    ))
    return Response.json(page, { headers })
  } catch (error: unknown) {
    const message = describe(error)
    ctx.logger.warn(`dsh-local-usage: call log failed: ${message}`)
    return Response.json({ error: message }, { status: 500, headers })
  }
}

/** Answer one report request with JSON, or a described failure. */
async function handleReport(
  ctx: Context,
  cache: Map<string, CachedSession>,
  folds: FoldCache,
  progress: ProgressTracker,
  config: UsageInsightsConfig,
  rates: RateStore,
  serialize: SerializedRead,
  generations: ReadonlyMap<string, number>,
  request: Request,
  background: () => Promise<void> | undefined,
): Promise<Response> {
  const url = new URL(request.url)
  try {
    // A background fold already reading this corpus is the same work this
    // request needs, so the request waits for it rather than decoding every log
    // a second time: two reads in flight together would each see an empty cache
    // and each walk the whole corpus.
    const pending = background()
    if (pending !== undefined) await pending
    const report = await serialize(() => assembleReport(ctx, cache, folds, progress, config, rates, {
      refresh: url.searchParams.get('refresh') === '1',
      from: numberParam(url.searchParams, 'from'),
      to: numberParam(url.searchParams, 'to'),
    }, generations))
    return Response.json(report, { headers: { 'cache-control': 'no-store' } })
  } catch (error: unknown) {
    const message = describe(error)
    ctx.logger.warn(`dsh-local-usage: report failed: ${message}`)
    return Response.json({ error: message }, { status: 500, headers: { 'cache-control': 'no-store' } })
  }
}

/**
 * Read one pricing write off an untrusted body.
 *
 * Every rate is validated before it reaches the store, so a malformed request
 * costs a 400 rather than a poisoned table: this file is what every later report
 * is priced with.
 *
 * @param value - the parsed request body.
 * @returns the update to apply, or `undefined` when the body is not one.
 */
function parsePricingUpdate(value: unknown): UsagePricingUpdate | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const models = (value as { models?: unknown }).models
  if (typeof models !== 'object' || models === null) return undefined
  const parsed: Record<string, UsageModelEdit | null> = {}
  for (const [match, candidate] of Object.entries(models as Record<string, unknown>)) {
    if (candidate === null) {
      parsed[match] = null
      continue
    }
    const edit = readModelEdit(candidate)
    if (edit === undefined) return undefined
    parsed[match] = edit
  }
  return { models: parsed }
}

/** Answer one rate-table write with the table now in effect. */
async function handlePricing(
  ctx: Context,
  rates: RateStore,
  request: Request,
): Promise<Response> {
  const headers = { 'cache-control': 'no-store' }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'expected a JSON body' }, { status: 400, headers })
  }
  const update = parsePricingUpdate(body)
  if (update === undefined) {
    return Response.json(
      { error: 'expected { set: { "<route>": {input, cacheRead, cacheWrite, output} | null } }' },
      { status: 400, headers },
    )
  }
  try {
    const models = await rates.write(update)
    return Response.json({ models }, { headers })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    ctx.logger.warn(`dsh-local-usage: pricing write failed: ${message}`)
    return Response.json({ error: message }, { status: 500, headers })
  }
}

/**
 * The one route-registration face of `ctx.connection`.
 *
 * This plugin reaches the Fetch carrier through a local structural type rather
 * than the Context augmentation: the host's Context declares no `connection`
 * member, so the harness's own route registrars read it with a cast (see
 * `session-log-export`). Keeping the shape here also means the plugin carries no
 * dependency on the package that provides the service.
 */
interface UsageInsightsConnection {
  readonly fetch: {
    register(route: {
      readonly path: string
      readonly methods: readonly ('GET' | 'HEAD' | 'POST')[]
      readonly requestBody: 'buffered'
      readonly fetch: (request: Request) => Promise<Response>
    }): () => Promise<void>
  }
}

/** Read the Fetch carrier off the Host context. */
function connectionOf(ctx: Context): UsageInsightsConnection {
  return Reflect.get(ctx, 'connection') as UsageInsightsConnection
}

/** Everything the four route registrations need from the activation. */
export interface RouteDependencies {
  readonly ctx: Context
  readonly cache: Map<string, CachedSession>
  readonly folds: FoldCache
  readonly progress: ProgressTracker
  readonly config: UsageInsightsConfig
  readonly rates: RateStore
  readonly serialize: SerializedRead
  readonly generations: ReadonlyMap<string, number>
  readonly background: () => Promise<void> | undefined
}

/**
 * Register the report, call-log, progress and pricing routes.
 * @param deps - the activation's caches, progress, configuration and queue.
 */
export function registerRoutes(deps: RouteDependencies): void {
  const { ctx, cache, folds, progress, config, rates, serialize, generations, background } = deps
  ctx.effect(
    () => connectionOf(ctx).fetch.register({
      path: REPORT_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: request => handleReport(ctx, cache, folds, progress, config, rates, serialize, generations, request, background),
    }),
    'dsh-local-usage: report route',
  )
  ctx.effect(
    () => connectionOf(ctx).fetch.register({
      path: CALLS_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: request => handleCalls(ctx, cache, folds, progress, config, rates, serialize, generations, request, background),
    }),
    'dsh-local-usage: calls route',
  )
  ctx.effect(
    () => connectionOf(ctx).fetch.register({
      path: PROGRESS_PATH,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: () => Promise.resolve(Response.json(progress.read(), {
        headers: { 'cache-control': 'no-store' },
      })),
    }),
    'dsh-local-usage: progress route',
  )
  ctx.effect(
    () => connectionOf(ctx).fetch.register({
      path: PRICING_PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: request => handlePricing(ctx, rates, request),
    }),
    'dsh-local-usage: pricing route',
  )
}
