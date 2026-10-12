import { describe, expect, it } from 'vitest'
import { buildReport, localDayKey } from '../src/aggregate.ts'
import type { PricingOptions, ReportMeta, SessionUsageInput } from '../src/aggregate.ts'
import { UNKNOWN_PROJECT } from '../src/types.ts'
import type { UsageTokens } from '../src/types.ts'

/** Monday 2026-09-21, 05:00 UTC — 13:00 Beijing, between the peak windows. */
const OFF_PEAK = Date.UTC(2026, 8, 21, 5, 0, 0)
/** Same Monday, 02:00 UTC — 10:00 Beijing, inside a peak window. */
const PEAK = Date.UTC(2026, 8, 21, 2, 0, 0)
const NEXT_DAY = OFF_PEAK + 86_400_000

const OPTIONS: PricingOptions = {
  currency: 'CNY',
  rules: [{ match: 'flash', input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 }],
  fallback: { input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 },
  overrides: new Map(),
  peakWindows: [{ start: 9 * 60, end: 12 * 60 }],
  peakWeekdaysOnly: true,
  peakMultiplier: 2,
}

const META: ReportMeta = {
  generatedAt: 1_700_000_000_000,
  unreadableSessions: 0,
  cached: false,
}

/** One token bucket set with every field stated. */
function tokens(uncachedInputTokens: number, outputTokens = 0): UsageTokens {
  return { uncachedInputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0 }
}

/** One session input built from `[time, route, tokens]` triples. */
function session(sessionId: string, samples: readonly [number, string, UsageTokens][], createdAt = 0): SessionUsageInput {
  return {
    sessionId,
    createdAt,
    samples: samples.map(([time, route, bucket]) => ({ time, route, tokens: bucket })),
  }
}

describe('localDayKey', () => {
  it('renders a zero-padded local day', () => {
    expect(localDayKey(new Date(2026, 0, 5).getTime())).toBe('2026-01-05')
  })

  it('separates two instants that fall on different local days', () => {
    expect(localDayKey(OFF_PEAK)).not.toBe(localDayKey(NEXT_DAY))
  })
})

describe('buildReport', () => {
  it('sums buckets, calls, and cost across sessions', () => {
    const report = buildReport([
      session('a', [[OFF_PEAK, 'x/flash', tokens(1_000_000)]]),
      session('b', [[OFF_PEAK, 'x/flash', tokens(2_000_000)]]),
    ], OPTIONS, META)

    expect(report.totals.uncachedInputTokens).toBe(3_000_000)
    expect(report.totals.calls).toBe(2)
    expect(report.totals.sessions).toBe(2)
    expect(report.totals.cost).toBeCloseTo(3, 10)
    expect(report.currency).toBe('CNY')
    expect(report.peakMultiplier).toBe(2)
  })

  it('prices a peak sample at the configured multiple', () => {
    const report = buildReport([
      session('a', [[PEAK, 'x/flash', tokens(1_000_000)]]),
    ], OPTIONS, META)

    expect(report.totals.cost).toBeCloseTo(2, 10)
  })

  it('orders day rows ascending and counts the sessions per day', () => {
    const report = buildReport([
      session('a', [[OFF_PEAK, 'x/flash', tokens(1_000_000)]]),
      session('b', [[OFF_PEAK, 'x/flash', tokens(1_000_000)], [NEXT_DAY, 'x/flash', tokens(1_000_000)]]),
    ], OPTIONS, META)

    expect(report.days.map(row => row.day)).toEqual([localDayKey(OFF_PEAK), localDayKey(NEXT_DAY)])
    expect(report.days[0]?.sessions).toBe(2)
    expect(report.days[1]?.sessions).toBe(1)
    expect(report.days[0]?.calls).toBe(2)
  })

  it('ranks routes and sessions by descending cost', () => {
    const report = buildReport([
      session('cheap', [[OFF_PEAK, 'x/flash', tokens(1_000_000)]]),
      session('dear', [[OFF_PEAK, 'x/flash', tokens(5_000_000)]]),
    ], OPTIONS, META)

    expect(report.sessions.map(row => row.sessionId)).toEqual(['dear', 'cheap'])
    expect(report.models.map(row => row.route)).toEqual(['x/flash'])
    expect(report.models[0]?.priced).toBe(true)
  })

  it('flags a route no rule claims and prices it at the fallback rate', () => {
    const report = buildReport([
      session('a', [[OFF_PEAK, 'unknown', tokens(1_000_000)]]),
    ], OPTIONS, META)

    expect(report.models[0]?.priced).toBe(false)
    expect(report.models[0]?.route).toBe('unknown')
    expect(report.unpricedRoutes).toEqual(['unknown'])
    expect(report.unpricedTokens).toBe(1_000_000)
    expect(report.totals.cost).toBeCloseTo(2, 10)
  })

  it('prices an unknown route at the peak rate when the sample is peak', () => {
    const report = buildReport([
      session('a', [[PEAK, 'unknown', tokens(1_000_000)]]),
    ], OPTIONS, META)

    expect(report.totals.cost).toBeCloseTo(4, 10)
  })

  it('omits sessions and days that recorded no usage', () => {
    const report = buildReport([
      session('empty', []),
      session('used', [[OFF_PEAK, 'x/flash', tokens(1_000_000)]], 1234),
    ], OPTIONS, META)

    expect(report.sessions.map(row => row.sessionId)).toEqual(['used'])
    expect(report.scannedSessions).toBe(2)
    expect(report.totals.sessions).toBe(1)
  })

  it('carries session identity facts onto the ranking row', () => {
    const report = buildReport([{
      sessionId: 's-1',
      title: 'Refactor the parser',
      cwd: '/work/app',
      createdAt: 111,
      samples: [{ time: OFF_PEAK, route: 'x/flash', tokens: tokens(1) }],
    }], OPTIONS, META)

    expect(report.sessions[0]).toMatchObject({
      sessionId: 's-1',
      title: 'Refactor the parser',
      cwd: '/work/app',
      createdAt: 111,
      updatedAt: OFF_PEAK,
    })
  })

  it('falls back to the creation time when a session recorded no sample time', () => {
    const report = buildReport([{
      sessionId: 's-1',
      createdAt: 999,
      samples: [],
    }], OPTIONS, META)

    expect(report.sessions).toEqual([])
    expect(report.scannedSessions).toBe(1)
  })

  it('carries the effective rate card and peak schedule onto the report', () => {
    const report = buildReport([], OPTIONS, META)

    expect(report.prices).toEqual([
      { match: 'flash', input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 },
    ])
    expect(report.fallbackPrice).toEqual({ match: '', input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 })
    expect(report.peakWindows).toEqual(['09:00-12:00'])
    expect(report.peakWeekdaysOnly).toBe(true)
  })

  it('reports an empty aggregate without inventing rows', () => {
    const report = buildReport([], OPTIONS, META)

    expect(report.totals).toEqual({
      uncachedInputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      cost: 0,
      calls: 0,
      sessions: 0,
    })
    expect(report.days).toEqual([])
    expect(report.models).toEqual([])
    expect(report.projects).toEqual([])
    expect(report.sessions).toEqual([])
    expect(report.unpricedRoutes).toEqual([])
    expect(report.cached).toBe(false)
  })

  it('agrees with a per-sample sum when peak and off-peak samples share a day', () => {
    const report = buildReport([
      session('a', [[PEAK, 'x/flash', tokens(1_000_000)], [OFF_PEAK, 'x/flash', tokens(1_000_000)]]),
    ], OPTIONS, META)

    expect(report.days).toHaveLength(1)
    expect(report.days[0]?.cost).toBeCloseTo(3, 10)
    expect(report.totals.cost).toBeCloseTo(3, 10)
  })
})

describe('project rows', () => {
  it('splits a window by working directory, ranked by cost', () => {
    const report = buildReport([
      { ...session('a', [[OFF_PEAK, 'x/flash', tokens(1_000_000)]]), cwd: '/work/api' },
      { ...session('b', [[OFF_PEAK, 'x/flash', tokens(3_000_000)]]), cwd: '/work/web' },
      { ...session('c', [[OFF_PEAK, 'x/flash', tokens(500_000)]]), cwd: '/work/api' },
    ], OPTIONS, META)

    expect(report.projects.map(row => row.path)).toEqual(['/work/web', '/work/api'])
    expect(report.projects[0]).toMatchObject({ cost: 3, calls: 1, sessions: 1 })
    // Two sessions spent from one directory, so the row counts both.
    expect(report.projects[1]).toMatchObject({ cost: 1.5, calls: 2, sessions: 2 })
    expect(report.projects[1]?.uncachedInputTokens).toBe(1_500_000)
  })

  it('buckets sessions whose header named no directory', () => {
    const report = buildReport([
      session('a', [[OFF_PEAK, 'x/flash', tokens(1_000_000)]]),
    ], OPTIONS, META)

    expect(report.projects.map(row => row.path)).toEqual([UNKNOWN_PROJECT])
    expect(report.projects[0]?.sessions).toBe(1)
  })

  it('adds up to the window total across every directory', () => {
    const report = buildReport([
      {
        ...session('a', [[OFF_PEAK, 'x/flash', tokens(1_000_000)], [NEXT_DAY, 'x/flash', tokens(1_000_000)]]),
        cwd: '/work/api',
      },
      { ...session('b', [[NEXT_DAY, 'x/flash', tokens(2_000_000)]]), cwd: '/work/web' },
      session('c', [[OFF_PEAK, 'x/flash', tokens(500_000)]]),
    ], OPTIONS, META)

    const summed = report.projects.reduce((sum, row) => sum + row.cost, 0)
    const summedCalls = report.projects.reduce((sum, row) => sum + row.calls, 0)
    expect(summed).toBeCloseTo(report.totals.cost, 10)
    expect(summedCalls).toBe(report.totals.calls)
  })

  it('gives a row only to a directory that actually spent', () => {
    const report = buildReport([
      { ...session('idle', []), cwd: '/work/unused' },
      { ...session('busy', [[OFF_PEAK, 'x/flash', tokens(1_000_000)]]), cwd: '/work/api' },
    ], OPTIONS, META)

    expect(report.projects.map(row => row.path)).toEqual(['/work/api'])
  })

  it('folds the day window into the same project axis', () => {
    const whole = buildReport([
      {
        ...session('a', [[OFF_PEAK, 'x/flash', tokens(1_000_000)], [NEXT_DAY, 'x/flash', tokens(4_000_000)]]),
        cwd: '/work/api',
      },
    ], OPTIONS, META)
    const oneDay = buildReport([
      {
        ...session('a', [[NEXT_DAY, 'x/flash', tokens(4_000_000)]]),
        cwd: '/work/api',
      },
    ], OPTIONS, META)

    // A drill-down is the same fold over a narrower window, not a second one.
    expect(oneDay.projects).toHaveLength(1)
    expect(oneDay.projects[0]?.path).toBe(whole.projects[0]?.path)
    expect(oneDay.projects[0]?.cost).toBeCloseTo(4, 10)
    expect(oneDay.projects[0]!.cost).toBeLessThan(whole.projects[0]!.cost)
  })
})

describe('route rates', () => {
  /** The same options with one route overridden, and one rule genuinely matched. */
  const OVERRIDDEN: PricingOptions = {
    ...OPTIONS,
    overrides: new Map([['agg/glm-5.3-flash', { input: 3, cacheRead: 0.3, cacheWrite: 3, output: 9 }]]),
  }

  it('publishes the source of every rate in effect', () => {
    const report = buildReport([
      session('a', [
        [OFF_PEAK, 'x/flash', tokens(1)],
        [OFF_PEAK, 'agg/glm-5.3-flash', tokens(1)],
        [OFF_PEAK, 'input/gpt-5.6-sol', tokens(1)],
      ]),
    ], OVERRIDDEN, META)

    const byRoute = new Map(report.routeRates.map(row => [row.route, row]))
    expect(byRoute.get('x/flash')).toMatchObject({
      source: 'rule',
      rule: 'flash',
      rate: { input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 },
    })
    expect(byRoute.get('agg/glm-5.3-flash')).toMatchObject({ source: 'override', rate: { output: 9 } })
    expect(byRoute.get('input/gpt-5.6-sol')).toMatchObject({ source: 'fallback' })
    expect(byRoute.get('agg/glm-5.3-flash')?.rule).toBeUndefined()
  })

  it('publishes the off-peak rate even when every sample of the route was peak', () => {
    const report = buildReport([
      session('a', [[PEAK, 'x/flash', tokens(1_000_000)]]),
    ], OPTIONS, META)

    // The sample was priced at 2x, and the table still states the base rate the
    // editor edits and the multiplier is applied to.
    expect(report.totals.cost).toBeCloseTo(2, 10)
    expect(report.routeRates[0]?.rate).toEqual({ input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 })
  })

  it('bills an overridden route at its override, not at the rule that would claim it', () => {
    const report = buildReport([
      session('a', [[OFF_PEAK, 'agg/glm-5.3-flash', tokens(1_000_000)]]),
    ], OVERRIDDEN, META)

    expect(report.totals.cost).toBeCloseTo(3, 10)
    expect(report.models[0]?.priced).toBe(true)
    expect(report.unpricedRoutes).toEqual([])
  })

  it('still names the routes nothing claims, and counts their tokens', () => {
    const report = buildReport([
      session('a', [[OFF_PEAK, 'input/gpt-5.6-sol', tokens(1_000_000)]]),
    ], OVERRIDDEN, META)

    expect(report.unpricedRoutes).toEqual(['input/gpt-5.6-sol'])
    expect(report.unpricedTokens).toBe(1_000_000)
  })

  it('orders the table by token volume, so the costly routes are read first', () => {
    const report = buildReport([
      session('a', [
        [OFF_PEAK, 'x/flash', tokens(10)],
        [OFF_PEAK, 'input/gpt-5.6-sol', tokens(5_000)],
      ]),
    ], OPTIONS, META)

    expect(report.routeRates.map(row => row.route)).toEqual(['input/gpt-5.6-sol', 'x/flash'])
    expect(report.routeRates.map(row => row.tokens)).toEqual([5_000, 10])
  })
})

describe('buildReport: the shape of the day', () => {
  it('always answers 24 hours, in order, with the quiet ones at zero', () => {
    const report = buildReport([session('a', [[PEAK, 'x/flash', tokens(1_000_000)]])], OPTIONS, META)

    expect(report.hourly).toHaveLength(24)
    expect(report.hourly.map(row => row.hour)).toEqual([...Array(24).keys()])
    expect(report.hourly[0]).toMatchObject({ cost: 0, calls: 0, tokens: 0 })
  })

  it('buckets by hour in Beijing time rather than the host machine’s zone', () => {
    // 02:00 UTC is 10:00 in Beijing, whatever the machine running this believes.
    const report = buildReport([session('a', [[PEAK, 'x/flash', tokens(1_000_000)]])], OPTIONS, META)

    expect(report.hourly[10]?.calls).toBe(1)
    expect(report.hourly[10]?.cost).toBeCloseTo(2)
    expect(report.hourly[10]?.tokens).toBe(1_000_000)
  })

  it('accumulates several settlements into the hour they share', () => {
    const report = buildReport([
      session('a', [[PEAK, 'x/flash', tokens(1_000_000)]]),
      session('b', [[PEAK + 60_000, 'x/flash', tokens(2_000_000)]]),
    ], OPTIONS, META)

    expect(report.hourly[10]).toMatchObject({ calls: 2, tokens: 3_000_000 })
    expect(report.hourly.reduce((sum, row) => sum + row.calls, 0)).toBe(2)
  })
})

describe('buildReport: a route series over the window', () => {
  it('folds each route its own day-by-day, dearest first', () => {
    const report = buildReport([
      session('a', [[PEAK, 'x/flash', tokens(1_000_000)], [OFF_PEAK, 'x/flash', tokens(1_000_000)]]),
      session('b', [[OFF_PEAK, 'x/pro', tokens(2_000_000)]]),
    ], OPTIONS, META)

    expect(report.routeSeries).toHaveLength(2)
    // pro spent 2, flash spent 2 — order breaks on the route name.
    expect(report.routeSeries.map(row => row.route).sort()).toEqual(['x/flash', 'x/pro'])
    const pro = report.routeSeries.find(row => row.route === 'x/pro')
    const flash = report.routeSeries.find(row => row.route === 'x/flash')
    // 'x/pro' matches no card's substring: it bills at the 2/1M fallback, so
    // 2M input = 4. flash's own card is 1/1M: peak 2.00, off-peak 1.00.
    expect(pro?.days.reduce((sum, day) => sum + day.cost, 0)).toBeCloseTo(4)
    expect(flash?.days.reduce((sum, day) => sum + day.cost, 0)).toBeCloseTo(3)
  })

  it('gives a route a row for every day of the window, gaps at zero', () => {
    const report = buildReport([
      session('a', [[PEAK, 'x/flash', tokens(1_000_000)], [NEXT_DAY, 'x/flash', tokens(1_000_000)]]),
    ], OPTIONS, META)

    const flash = report.routeSeries[0]
    expect(flash?.days).toHaveLength(2)
    // 1M input on the 1/1M flash card: 2.00 at peak (×2), 1.00 off-peak.
    expect(flash?.days[0]?.cost).toBeCloseTo(2)
    expect(flash?.days[1]?.cost).toBeCloseTo(1)
  })
})
