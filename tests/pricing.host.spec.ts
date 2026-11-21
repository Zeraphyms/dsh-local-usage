import { describe, expect, it } from 'vitest'
import {
  beijingClock,
  costOf,
  isPeakTime,
  parsePeakWindow,
  selectRate,
} from '../src/pricing.ts'
import type { ModelPrice } from '../src/pricing.ts'

/** 2026-09-21 is a Monday; 02:00 UTC is 10:00 in Beijing, inside the first peak window. */
const MONDAY_PEAK = Date.UTC(2026, 8, 21, 2, 0, 0)
/** Same Monday, 06:00 UTC — 14:00 Beijing, inside the second peak window. */
const MONDAY_PEAK_AFTERNOON = Date.UTC(2026, 8, 21, 6, 0, 0)
/** Same Monday, 05:00 UTC — 13:00 Beijing, between the two peak windows. */
const MONDAY_GAP = Date.UTC(2026, 8, 21, 5, 0, 0)
/** 2026-09-20 is a Sunday; 02:00 UTC is 10:00 Beijing inside a window, but a weekend. */
const SUNDAY_PEAK = Date.UTC(2026, 8, 20, 2, 0, 0)

const WINDOWS = [
  { start: 9 * 60, end: 12 * 60 },
  { start: 14 * 60, end: 18 * 60 },
]

const FALLBACK: ModelPrice = {
  match: '',
  peakEnabled: true,
  offPeak: { input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 },
  peak: { input: 4, cacheRead: 0.08, cacheWrite: 4, output: 16 },
}
/** Two model cards, the peak set doubled — a model may state any peak price it likes. */
const CARDS: readonly ModelPrice[] = [
  {
    match: 'v4-pro',
    peakEnabled: true,
    offPeak: { input: 4.5, cacheRead: 0.15, cacheWrite: 4.5, output: 13.5 },
    peak: { input: 9, cacheRead: 0.3, cacheWrite: 9, output: 27 },
  },
  {
    match: 'flash',
    peakEnabled: true,
    offPeak: { input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 },
    peak: { input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 },
  },
  {
    match: 'flat-model',
    peakEnabled: false,
    offPeak: { input: 3, cacheRead: 0.1, cacheWrite: 3, output: 9 },
    peak: { input: 3, cacheRead: 0.1, cacheWrite: 3, output: 9 },
  },
]

describe('parsePeakWindow', () => {
  it('parses a half-open minute range', () => {
    expect(parsePeakWindow('09:00-12:00')).toEqual({ start: 540, end: 720 })
    expect(parsePeakWindow(' 14:00 - 18:30 ')).toEqual({ start: 840, end: 1110 })
  })

  it('rejects malformed and empty windows', () => {
    expect(parsePeakWindow('09:00')).toBeUndefined()
    expect(parsePeakWindow('noon')).toBeUndefined()
    expect(parsePeakWindow('12:00-09:00')).toEqual({ start: 720, end: 540 })
    expect(parsePeakWindow('09:00-09:00')).toBeUndefined()
    expect(parsePeakWindow('25:00-26:00')).toBeUndefined()
    expect(parsePeakWindow('09:90-12:00')).toBeUndefined()
    expect(parsePeakWindow('09:00-12:60')).toBeUndefined()
  })

  it('accepts a midnight end but never a midnight start', () => {
    expect(parsePeakWindow('09:00-24:00')).toEqual({ start: 540, end: 1440 })
    expect(parsePeakWindow('24:00-24:30')).toBeUndefined()
  })

  it('keeps a window that crosses midnight as one window', () => {
    expect(parsePeakWindow('22:00-02:00')).toEqual({ start: 1320, end: 120 })
  })
})

describe('beijingClock', () => {
  it('shifts UTC into Beijing time without daylight saving', () => {
    expect(beijingClock(MONDAY_PEAK)).toEqual({ weekday: 1, minutes: 600 })
    expect(beijingClock(MONDAY_GAP)).toEqual({ weekday: 1, minutes: 780 })
    expect(beijingClock(SUNDAY_PEAK)).toEqual({ weekday: 0, minutes: 600 })
  })
})

describe('isPeakTime', () => {
  it('matches each configured window', () => {
    expect(isPeakTime(MONDAY_PEAK, WINDOWS, true)).toBe(true)
    expect(isPeakTime(MONDAY_PEAK_AFTERNOON, WINDOWS, true)).toBe(true)
  })

  it('treats the gap between windows as off-peak', () => {
    expect(isPeakTime(MONDAY_GAP, WINDOWS, true)).toBe(false)
  })

  it('excludes weekends only when asked', () => {
    expect(isPeakTime(SUNDAY_PEAK, WINDOWS, true)).toBe(false)
    expect(isPeakTime(SUNDAY_PEAK, WINDOWS, false)).toBe(true)
  })

  it('reads a window that crosses midnight on both sides of it', () => {
    const overnight = [{ start: 22 * 60, end: 2 * 60 }]
    // 23:00 and 01:00 Beijing on a Tuesday.
    const late = Date.UTC(2026, 8, 21, 15, 0, 0)
    const early = Date.UTC(2026, 8, 21, 17, 0, 0)
    expect(isPeakTime(late, overnight, false)).toBe(true)
    expect(isPeakTime(early, overnight, false)).toBe(true)
    expect(isPeakTime(MONDAY_GAP, overnight, false)).toBe(false)
  })

  it('is never peak without a window, even on a weekday', () => {
    expect(isPeakTime(MONDAY_PEAK, [], true)).toBe(false)
  })

  it('excludes the window end and includes its start', () => {
    expect(isPeakTime(Date.UTC(2026, 8, 21, 1, 0, 0), WINDOWS, true)).toBe(true)
    expect(isPeakTime(Date.UTC(2026, 8, 21, 4, 0, 0), WINDOWS, true)).toBe(false)
  })
})

describe('selectRate', () => {
  it('prices a route with the first model that claims it', () => {
    const selected = selectRate(CARDS, FALLBACK, 'commoncode/deepseek-v4-pro', false)
    expect(selected).toEqual({
      rate: { input: 4.5, cacheRead: 0.15, cacheWrite: 4.5, output: 13.5 },
      matched: true,
      source: 'model',
      model: 'v4-pro',
      peakApplied: false,
    })
  })

  it('lets a per-route card outrank a model card that also claims the route', () => {
    const scoped: ModelPrice = {
      match: 'vendor/deepseek-v4.1-flash',
      route: 'vendor/deepseek-v4.1-flash',
      peakEnabled: false,
      offPeak: { input: 9, cacheRead: 0.9, cacheWrite: 9, output: 99 },
      peak: { input: 9, cacheRead: 0.9, cacheWrite: 9, output: 99 },
    }

    expect(selectRate([...CARDS, scoped], FALLBACK, 'vendor/deepseek-v4.1-flash', false).rate)
      .toEqual(scoped.offPeak)
    expect(selectRate([...CARDS, scoped], FALLBACK, 'vendor/deepseek-v4.1-flash', false).model)
      .toBe('vendor/deepseek-v4.1-flash')
  })

  it('claims a vendor route by the model inside it', () => {
    // One card prices every route that carries the model's name, whatever sits
    // in front of it: this is what makes a vendor-prefixed route free to price.
    expect(selectRate(CARDS, FALLBACK, 'workbuddy/cn:deepseek-v4.1-flash', false).model).toBe('flash')
    expect(selectRate(CARDS, FALLBACK, 'vendor-a/deepseek-v4.1-flash', false).model).toBe('flash')
  })

  it('matches case-insensitively on the route', () => {
    expect(selectRate(CARDS, FALLBACK, 'COMMONCODE/DeepSeek-V4.1-FLASH', false).rate.input).toBe(1)
  })

  it('falls back when no model claims the route', () => {
    expect(selectRate(CARDS, FALLBACK, 'other/gpt', false))
      .toEqual({
        rate: { input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 },
        matched: false,
        source: 'fallback',
        peakApplied: false,
      })
  })

  it('uses the card’s own peak prices inside a window', () => {
    // Stated, not derived: this card's peak set is twice its off-peak set, but
    // nothing in the engine assumes that ratio.
    expect(selectRate(CARDS, FALLBACK, 'x/flash', true).rate)
      .toEqual({ input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 })
    expect(selectRate(CARDS, FALLBACK, 'x/flash', true).peakApplied).toBe(true)
  })

  it('keeps a flat-priced model on one price all day', () => {
    const peak = selectRate(CARDS, FALLBACK, 'x/flat-model', true)
    const offPeak = selectRate(CARDS, FALLBACK, 'x/flat-model', false)
    expect(peak.rate).toEqual(offPeak.rate)
    expect(peak.peakApplied).toBe(false)
  })

  it('honours a peak set that is not double the off-peak set', () => {
    const odd: ModelPrice = {
      match: 'odd-model',
      peakEnabled: true,
      offPeak: { input: 1, cacheRead: 0.1, cacheWrite: 1, output: 2 },
      peak: { input: 1.5, cacheRead: 0.12, cacheWrite: 1.5, output: 2.5 },
    }
    expect(selectRate([odd], FALLBACK, 'x/odd-model', true).rate).toEqual(odd.peak)
  })
})

describe('costOf', () => {
  it('prices each bucket per million tokens', () => {
    expect(costOf({
      uncachedInputTokens: 1_000_000,
      outputTokens: 500_000,
      cacheReadTokens: 2_000_000,
      cacheWriteTokens: 0,
    }, { input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 })).toBeCloseTo(1 + 2 + 0.04, 10)
  })

  it('prices an empty bucket set at zero', () => {
    expect(costOf({
      uncachedInputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    }, FALLBACK.offPeak)).toBe(0)
  })
})

describe('context tiers', () => {
  const FALLBACK: ModelPrice = { match: '', peakEnabled: false, peak: { input: 4, cacheRead: 0.4, cacheWrite: 4, output: 16 }, offPeak: { input: 2, cacheRead: 0.2, cacheWrite: 2, output: 8 } }
  const BASE = { input: 10, cacheRead: 1, cacheWrite: 12.5, output: 50 }
  const ABOVE = { input: 20, cacheRead: 2, cacheWrite: 25, output: 75 }
  const CARDS: ModelPrice[] = [{ match: 'gpt-6-astra', peakEnabled: true, peak: ABOVE, offPeak: BASE, tierEnabled: true, tierThresholdK: 272, tier: ABOVE }]

  it('bills by the request prompt size and ignores the peak window', () => {
    // 272K exactly sits in the base tier; one token above it does not.
    const at = selectRate(CARDS, FALLBACK, 'p/gpt-6-astra', true, 272000)
    expect(at).toMatchObject({ rate: BASE, appliedBy: 'context', tierApplied: false, peakApplied: false })
    const above = selectRate(CARDS, FALLBACK, 'p/gpt-6-astra', true, 272001)
    expect(above).toMatchObject({ rate: ABOVE, appliedBy: 'context', tierApplied: true })
    // The prompt size is the whole context: cache reads and writes count.
    const viaCache = selectRate(CARDS, FALLBACK, 'p/gpt-6-astra', true, 100000 + 150000 + 22001)
    expect(viaCache).toMatchObject({ tierApplied: true })
  })

  it('prices every settlement of a non-tiered card as before', () => {
    const flat = selectRate([{ match: 'glm-5.3-flash', peakEnabled: false, peak: BASE, offPeak: BASE }], FALLBACK, 'x/glm-5.3-flash', true, 999_999)
    expect(flat).toMatchObject({ rate: BASE, peakApplied: false })
    expect(flat.appliedBy).toBeUndefined()
  })
})
