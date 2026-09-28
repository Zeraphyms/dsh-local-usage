/**
 * Synthetic usage corpus for the promotional video.
 *
 * The film must not show the author's real projects, session counts or money,
 * so the panel is rendered from generated records instead of read from a Host.
 * Every figure below is derived from one deterministic pseudo-random stream, so
 * two renders of the same scene are byte-identical and a re-run of the build
 * never drifts.
 *
 * @module dsh-local-usage/video/panel/fixture
 */

import type {
  UsageCosted,
  UsageDayRow,
  UsageInsightsReport,
  UsageModelRow,
  UsagePriceRow,
  UsageProjectRow,
  UsageRate,
  UsageReliability,
  UsageRouteRate,
  UsageTokens,
} from '../../src/types.ts'

const MS_PER_DAY = 86_400_000

/** Deterministic PRNG; the film re-renders the same numbers every build. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

interface Rate { readonly input: number; readonly cacheRead: number; readonly cacheWrite: number; readonly output: number }

/** Rate cards the film's panel displays; demo names, demo rates. */
const FLASH: Rate = { input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 }
const PRO: Rate = { input: 4.5, cacheRead: 0.15, cacheWrite: 4.5, output: 13.5 }

const FLASH_ROUTE = 'demo-vendor/demo-v4-flash'
const PRO_ROUTE = 'demo-vendor/demo-v4-pro'

/** Working directories the demo session headers carry; none of them is real. */
const PROJECTS = [
  '/Users/demo/work/atlas-web',
  '/Users/demo/work/atlas-api',
  '/Users/demo/work/orbit-mobile',
] as const

/** One synthetic (day, project, route) settlement group. */
interface Record {
  readonly day: string
  readonly dayTime: number
  readonly project: string
  readonly route: string
  readonly tokens: UsageTokens
  /** Whether the call fell inside a peak window, which the rate is scaled by. */
  readonly peak: boolean
  readonly calls: number
  readonly sessions: number
}

/**
 * Rates the capture harness has edited, keyed by exact route.
 *
 * The fixture re-prices on every read rather than baking cost into the corpus,
 * so an edit made in the panel's rate editor is visible in the very next render —
 * the same shape the Host has.
 */
const OVERRIDES = new Map<string, UsageRate>()

/** Replace the harness's edited rates. */
export function setOverrides(routes: Map<string, UsageRate>): void {
  OVERRIDES.clear()
  for (const [route, rate] of routes) OVERRIDES.set(route, rate)
}

/** Every rate the harness currently has overridden, for the save round trip. */
export function readOverrides(): Record<string, UsageRate> {
  return Object.fromEntries(OVERRIDES)
}

/** The rate one route is billed at: an edit, else the card that claims it. */
function rateFor(route: string): UsageRate {
  return OVERRIDES.get(route) ?? (route === PRO_ROUTE ? PRO : FLASH)
}

/** What one record cost at the rates in effect. */
function costFor(record: Record): number {
  return costOf(record.tokens, rateFor(record.route), record.peak)
}

/** Local calendar day key, matching the Host fold's own key. */
function localDayKey(time: number): string {
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${String(date.getFullYear())}-${month}-${day}`
}

/** Local midnight of the day containing `time`. */
function startOfDay(time: number): number {
  const date = new Date(time)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Price one bucket set at one rate. */
function costOf(tokens: UsageTokens, rate: Rate, peak: boolean): number {
  const factor = peak ? 2 : 1
  return (
    tokens.uncachedInputTokens * rate.input * factor
    + tokens.cacheReadTokens * rate.cacheRead * factor
    + tokens.cacheWriteTokens * rate.cacheWrite * factor
    + tokens.outputTokens * rate.output * factor
  ) / 1_000_000
}

/** Days of history before the first record; the calendar's left edge stays quiet. */
const HISTORY_DAYS = 300
/** Days generated back from today, enough to fill a 52-week calendar plus slack. */
const SPAN_DAYS = 420

/** Build the whole synthetic corpus once, newest day first. */
function buildRecords(): Record[] {
  const today = startOfDay(Date.now())
  const records: Record[] = []
  for (let offset = 0; offset <= SPAN_DAYS; offset += 1) {
    if (offset > HISTORY_DAYS) continue
    const dayTime = today - offset * MS_PER_DAY
    const random = mulberry32(1_000 + offset * 7)
    const weekday = new Date(dayTime).getDay()
    const weekend = weekday === 0 || weekday === 6
    // A quiet start, a busy recent quarter: the calendar reads as a ramping habit.
    const ramp = 0.45 + 0.95 * (HISTORY_DAYS - offset) / HISTORY_DAYS
    const spike = random() < 0.055 ? 3.1 : 1
    const shape = ramp * (weekend ? 0.32 : 1) * spike
    for (const [index, project] of PROJECTS.entries()) {
      // Seeded per project index rather than per name: two directories of equal
      // length must not produce identical days.
      const draw = mulberry32(9_000 + offset * 31 + index * 1_013)
      // An agent day is a few hundred billed calls; the demo corpus is shaped so
      // the year lands in the same order of magnitude as a real profile's.
      const calls = Math.round((22 + draw() * 78) * shape * (0.55 + draw() * 0.9))
      if (calls <= 0) continue
      const uncachedInputTokens = Math.round(calls * (5_500 + draw() * 11_000))
      const outputTokens = Math.round(calls * (2_600 + draw() * 6_400))
      const cacheReadTokens = Math.round(uncachedInputTokens * (7 + draw() * 16))
      const cacheWriteTokens = draw() < 0.22 ? Math.round(uncachedInputTokens * 0.7) : 0
      const tokens: UsageTokens = { uncachedInputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }
      const route = draw() < 0.18 ? PRO_ROUTE : FLASH_ROUTE
      const hour = Math.floor(draw() * 24)
      const peak = !weekend && ((hour >= 9 && hour < 12) || (hour >= 14 && hour < 18))
      records.push({
        day: localDayKey(dayTime),
        dayTime,
        project,
        route,
        tokens,
        peak,
        calls,
        sessions: 1 + Math.floor(draw() * 3),
      })
    }
  }
  return records
}

const RECORDS = buildRecords()

/** Sum one record set's buckets into a costed row. */
function costedOf(records: readonly Record[]): UsageCosted {
  const totals = { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, cost: 0, calls: 0 }
  for (const record of records) {
    totals.uncachedInputTokens += record.tokens.uncachedInputTokens
    totals.outputTokens += record.tokens.outputTokens
    totals.cacheReadTokens += record.tokens.cacheReadTokens
    totals.cacheWriteTokens += record.tokens.cacheWriteTokens
    totals.cost += costFor(record)
    totals.calls += record.calls
  }
  return totals
}

/** Total tokens of one record set. */
function tokensOfRecords(records: readonly Record[]): number {
  let total = 0
  for (const record of records) {
    total += record.tokens.uncachedInputTokens
      + record.tokens.outputTokens
      + record.tokens.cacheReadTokens
      + record.tokens.cacheWriteTokens
  }
  return total
}

/** Distinct sessions behind a record set: one seat per (day, project, session ordinal). */
function sessionsOf(records: readonly Record[]): number {
  const seats = new Set<string>()
  for (const record of records) {
    for (let ordinal = 0; ordinal < record.sessions; ordinal += 1) {
      seats.add(`${record.day}|${record.project}|${ordinal}`)
    }
  }
  return seats.size
}

/** Reliability figures scaled off the window's call volume, so a range change moves them too. */
function reliabilityOf(calls: number): UsageReliability {
  return {
    retries: Math.max(0, Math.round(calls * 0.019)),
    retryCauses: [
      { code: 'RATE_LIMIT', count: Math.max(1, Math.round(calls * 0.011)) },
      { code: 'TIMEOUT', count: Math.max(0, Math.round(calls * 0.005)) },
      { code: 'UPSTREAM_ERROR', count: Math.max(0, Math.round(calls * 0.003)) },
    ],
    toolCalls: Math.round(calls * 2.6),
    toolErrors: Math.max(0, Math.round(calls * 0.04)),
    toolErrorCodes: [
      { code: 'FS_STALE_VERSION', count: Math.max(0, Math.round(calls * 0.022)) },
      { code: 'PATCH_CONFLICT', count: Math.max(0, Math.round(calls * 0.012)) },
    ],
    compactions: Math.max(0, Math.round(calls * 0.012)),
    compactionFailures: Math.max(0, Math.round(calls * 0.0015)),
  }
}

/**
 * Fold the synthetic corpus into the report shape the panel consumes.
 * @param from - inclusive lower bound in epoch milliseconds, or `undefined` for unbounded.
 * @param to - inclusive upper bound in epoch milliseconds, or `undefined` for unbounded.
 * @returns a complete demo report.
 */
export function makeReport(from?: number, to?: number): UsageInsightsReport {
  const records = RECORDS.filter(record =>
    (from === undefined || record.dayTime >= from) && (to === undefined || record.dayTime <= to))

  const byDay = new Map<string, Record[]>()
  const byProject = new Map<string, Record[]>()
  const byRoute = new Map<string, Record[]>()
  for (const record of records) {
    const dayBucket = byDay.get(record.day)
    if (dayBucket === undefined) byDay.set(record.day, [record])
    else dayBucket.push(record)
    const projectBucket = byProject.get(record.project)
    if (projectBucket === undefined) byProject.set(record.project, [record])
    else projectBucket.push(record)
    const routeBucket = byRoute.get(record.route)
    if (routeBucket === undefined) byRoute.set(record.route, [record])
    else routeBucket.push(record)
  }

  const days: UsageDayRow[] = [...byDay.entries()]
    .map(([day, bucket]) => ({
      day,
      ...costedOf(bucket),
      sessions: sessionsOf(bucket),
    }))
    .sort((left, right) => left.day.localeCompare(right.day))

  const projects: UsageProjectRow[] = [...byProject.entries()]
    .map(([path, bucket]) => ({
      path,
      ...costedOf(bucket),
      sessions: sessionsOf(bucket),
    }))
    .sort((left, right) => right.cost - left.cost)

  const models: UsageModelRow[] = [...byRoute.entries()]
    .map(([route, bucket]) => ({ route, priced: true, ...costedOf(bucket) }))
    .sort((left, right) => right.cost - left.cost)

  const totals = costedOf(records)
  const prices: UsagePriceRow[] = [
    { match: 'v4-pro', ...PRO },
    { match: 'flash', ...FLASH },
  ]
  /** Route names carry the rule that claims them, as the real fold reports it. */
  const ROUTE_RULES: readonly { readonly route: string; readonly rate: UsageRate; readonly rule: string }[] = [
    { route: FLASH_ROUTE, rate: FLASH, rule: 'flash' },
    { route: PRO_ROUTE, rate: PRO, rule: 'v4-pro' },
  ]
  const routeRates: UsageRouteRate[] = ROUTE_RULES
    .map(entry => {
      const bucket = byRoute.get(entry.route)
      const overridden = OVERRIDES.has(entry.route)
      return {
        route: entry.route,
        rate: rateFor(entry.route),
        source: overridden ? 'override' as const : 'rule' as const,
        ...overridden ? {} : { rule: entry.rule },
        tokens: bucket === undefined ? 0 : tokensOfRecords(bucket),
      }
    })
    .sort((left, right) => right.tokens - left.tokens)

  return {
    generatedAt: Date.now(),
    currency: 'CNY',
    totals: {
      ...totals,
      sessions: sessionsOf(records),
    },
    days,
    models,
    projects,
    sessions: [],
    scannedSessions: 128,
    unreadableSessions: 0,
    reliability: reliabilityOf(totals.calls),
    unpricedRoutes: [],
    unpricedTokens: 0,
    cached: false,
    peakMultiplier: 2,
    prices,
    routeRates,
    fallbackPrice: { match: '', ...FLASH },
    peakWindows: ['09:00-12:00', '14:00-18:00'],
    peakWeekdaysOnly: true,
  }
}

/** The demo report for the whole generated history. */
export const FULL_REPORT = makeReport()
