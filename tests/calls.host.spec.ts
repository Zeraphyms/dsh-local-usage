/**
 * The call log's query: what it pages, what it filters and what it totals.
 *
 * The page is the only surface that keeps settlements apart, so the rules here
 * are the ones the table leans on: a page is a slice of a stable order, totals
 * cover the whole match rather than the slice, and the model facet describes the
 * window rather than the filter the reader has already applied. They are pure
 * functions over folds the Host already holds, which is what lets this suite
 * skip a session engine entirely.
 *
 * @module dsh-local-usage/tests/calls
 */

import { describe, expect, it } from 'vitest'
import { queryCalls } from '../src/calls.ts'
import type { PricingOptions, SessionUsageInput } from '../src/aggregate.ts'
import type { UsageTokens } from '../src/types.ts'

/** Monday 2026-09-21, 05:00 UTC — 13:00 Beijing, between the peak windows. */
const OFF_PEAK = Date.UTC(2026, 8, 21, 5, 0, 0)
/** Same Monday, 02:00 UTC — 10:00 Beijing, inside the peak window. */
const PEAK = Date.UTC(2026, 8, 21, 2, 0, 0)

const OPTIONS: PricingOptions = {
  currency: 'CNY',
  models: [
    {
      match: 'flash',
      peakEnabled: true,
      offPeak: { input: 1, cacheRead: 0.1, cacheWrite: 1, output: 2 },
      peak: { input: 2, cacheRead: 0.2, cacheWrite: 2, output: 4 },
    },
    {
      match: 'glm',
      peakEnabled: true,
      offPeak: { input: 2, cacheRead: 0.2, cacheWrite: 2, output: 3 },
      peak: { input: 4, cacheRead: 0.4, cacheWrite: 4, output: 6 },
    },
  ],
  fallback: {
    match: '',
    peakEnabled: true,
    offPeak: { input: 5, cacheRead: 0.5, cacheWrite: 5, output: 10 },
    peak: { input: 10, cacheRead: 1, cacheWrite: 10, output: 20 },
  },
  peakWindows: [{ start: 9 * 60, end: 12 * 60 }],
  peakWeekdaysOnly: true,
}

const META = {
  generatedAt: 1_700_000_000_000,
  scannedSessions: 3,
  unreadableSessions: 0,
  cached: true,
}

/** One token bucket with every field stated. */
function tokens(
  uncachedInputTokens: number,
  outputTokens = 0,
  cacheReadTokens = 0,
  cacheWriteTokens = 0,
): UsageTokens {
  return { uncachedInputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }
}

/** One session input built from `[time, route, tokens]` triples. */
function session(
  sessionId: string,
  samples: readonly [number, string, UsageTokens][],
  extra: { readonly title?: string; readonly cwd?: string } = {},
): SessionUsageInput {
  return {
    sessionId,
    createdAt: OFF_PEAK,
    ...extra,
    samples: samples.map(([time, route, bucket]) => ({ time, route, tokens: bucket })),
  }
}

/** Three sessions, four calls: two flash calls off-peak, one glm at peak, one unpriced. */
const INPUTS: readonly SessionUsageInput[] = [
  session('alpha', [
    [OFF_PEAK, 'vendor/deepseek-v4-flash', tokens(100, 10, 1000)],
    [OFF_PEAK + 1000, 'vendor/deepseek-v4-flash', tokens(200, 20, 2000)],
  ], { title: 'Alpha work', cwd: '/work/alpha' }),
  session('beta', [
    [PEAK, 'other/glm-5.3', tokens(300, 30)],
    [PEAK + 1000, 'aggregator/cn:glm-5.3-fast', tokens(50, 5)],
  ], { title: 'Beta work', cwd: '/work/beta' }),
  session('gamma', [
    [PEAK + 2000, 'unknown', tokens(10, 1)],
  ]),
]

describe('queryCalls', () => {
  it('pages a stable newest-first order and totals every match, not the page', () => {
    const page = queryCalls(INPUTS, OPTIONS, { limit: 2 }, META)

    expect(page.total).toBe(5)
    expect(page.rows).toHaveLength(2)
    expect(page.rows.map(row => row.time)).toEqual([OFF_PEAK + 1000, OFF_PEAK])
    expect(page.totals.calls).toBe(5)
    expect(page.totals.uncachedInputTokens).toBe(660)
    expect(page.limit).toBe(2)
    expect(page.offset).toBe(0)
  })

  it('walks the next page without repeating or skipping a row', () => {
    const first = queryCalls(INPUTS, OPTIONS, { limit: 2 }, META)
    const second = queryCalls(INPUTS, OPTIONS, { limit: 2, offset: 2 }, META)

    const ids = [...first.rows, ...second.rows].map(row => row.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(second.rows[0]?.time).toBe(PEAK + 2000)
  })

  it('applies the query window itself, even when the caller hands over wider folds', () => {
    const page = queryCalls(INPUTS, OPTIONS, { from: OFF_PEAK, to: OFF_PEAK + 500 }, META)

    expect(page.total).toBe(1)
    expect(page.rows[0]?.time).toBe(OFF_PEAK)
    expect(page.totals.calls).toBe(1)
  })

  it('filters a model by identity, so its vendor spellings travel together', () => {
    const page = queryCalls(INPUTS, OPTIONS, { model: 'glm-5.3' }, META)

    expect(page.total).toBe(2)
    expect(page.rows.every(row => row.model.startsWith('glm-5.3'))).toBe(true)
    expect(page.totals.calls).toBe(2)
  })

  it('searches session title, directory and route as one case-insensitive string', () => {
    expect(queryCalls(INPUTS, OPTIONS, { q: 'alpha' }, META).total).toBe(2)
    expect(queryCalls(INPUTS, OPTIONS, { q: '/work/beta' }, META).total).toBe(2)
    expect(queryCalls(INPUTS, OPTIONS, { q: 'deepseek' }, META).total).toBe(2)
    expect(queryCalls(INPUTS, OPTIONS, { q: 'nothing' }, META).total).toBe(0)
  })

  it('keeps every route in the facet even when the model filter hides them', () => {
    const page = queryCalls(INPUTS, OPTIONS, { model: 'glm-5.3' }, META)
    const routes = page.routes.map(facet => facet.route)

    expect(page.rows).toHaveLength(2)
    expect(routes).toContain('vendor/deepseek-v4-flash')
    expect(routes).toContain('other/glm-5.3')
    expect(routes).toContain('unknown')
    expect(page.routes.find(facet => facet.route === 'vendor/deepseek-v4-flash')?.calls).toBe(2)
  })

  it('carries a settlement\'s turn, step and timing onto its row', () => {
    const timed = session('timed', [[OFF_PEAK, 'vendor/deepseek-v4-flash', tokens(10, 5)]])
    const sample = timed.samples[0]
    if (sample === undefined) throw new Error('fixture has no sample')
    const page = queryCalls([{
      ...timed,
      samples: [{ ...sample, turn: 2, step: 3, firstTokenMs: 120, durationMs: 500, outputTps: 10 }],
    }], OPTIONS, {}, META)

    expect(page.rows[0]).toMatchObject({
      turn: 2,
      step: 3,
      firstTokenMs: 120,
      durationMs: 500,
      outputTps: 10,
    })
  })

  it('orders by cost or output when asked, and keeps a deterministic tail', () => {
    const byCost = queryCalls(INPUTS, OPTIONS, { sort: 'cost', dir: 'desc' }, META)
    const costs = byCost.rows.map(row => row.cost)
    expect(costs).toEqual([...costs].sort((left, right) => right - left))

    const byOutput = queryCalls(INPUTS, OPTIONS, { sort: 'output', dir: 'desc' }, META)
    expect(byOutput.rows[0]?.tokens.outputTokens).toBe(30)

    const ascending = queryCalls(INPUTS, OPTIONS, { sort: 'time', dir: 'asc' }, META)
    expect(ascending.rows[0]?.time).toBe(PEAK)
  })

  it('states the fallback badge and prices each call at its own clock', () => {
    const page = queryCalls(INPUTS, OPTIONS, {}, META)
    const unpriced = page.rows.find(row => row.route === 'unknown')
    expect(unpriced?.priced).toBe(false)

    const peakGlm = page.rows.find(row => row.route === 'other/glm-5.3')
    // 300 input at 4 per million + 30 output at 6 per million, peak prices.
    expect(peakGlm?.cost).toBeCloseTo((300 * 4 + 30 * 6) / 1_000_000, 12)

    const offPeakFlash = page.rows.find(row => row.time === OFF_PEAK)
    // 100 input at 1, 10 output at 2, 1000 cache reads at 0.1.
    expect(offPeakFlash?.cost).toBeCloseTo((100 * 1 + 10 * 2 + 1000 * 0.1) / 1_000_000, 12)
  })

  it('clamps a page size no reader could use and an offset past the end', () => {
    const huge = queryCalls(INPUTS, OPTIONS, { limit: 999 }, META)
    expect(huge.limit).toBe(200)
    expect(huge.rows).toHaveLength(5)

    const past = queryCalls(INPUTS, OPTIONS, { offset: 99 }, META)
    expect(past.rows).toHaveLength(0)
    expect(past.total).toBe(5)
  })

  it('accepts a comma-separated session set for merged fork chains', () => {
    const input = (id, text) => ({
      sessionId: id,
      title: text,
      cwd: 'D:/artra',
      createdAt: OFF_PEAK,
      samples: [
        { time: OFF_PEAK, route: 'p/m', tokens: { uncachedInputTokens: 10, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 } },
      ],
    });
    const report = queryCalls(
      [input('session-aaa', 'A'), input('session-bbb', 'A'), input('session-ccc', 'B')],
      OPTIONS,
      { session: 'session-aaa,session-bbb' },
      { generatedAt: OFF_PEAK, scannedSessions: 3, unreadableSessions: 0, cached: false },
    );
    expect(report.total).toBe(2);
    expect(report.rows.every((row) => row.sessionId !== 'session-ccc')).toBe(true);
  });
})
