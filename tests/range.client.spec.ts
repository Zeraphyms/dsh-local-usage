/**
 * The range vocabulary: preset bounds, a hand-picked window, and the wave's
 * bucket chosen by length.
 *
 * These are pure date rules, so the interesting cases are at the edges: a local
 * day that is 23 or 25 hours long must still end at the next local midnight, and
 * a hand-picked range must not gain or lose a day when the clocks move.
 *
 * @module dsh-local-usage/tests/range
 */

import { describe, expect, it } from 'vitest'
import { addDays, dayKey, dayTime, nextDayStart } from '../src/client/heatmap-grid.ts'
import { clampDay, rangeBounds, waveRangeOf } from '../src/client/range.ts'

/** Local noon, so a test's frame does not depend on the hour it runs at. */
function noon(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day, 12).getTime()
}

describe('rangeBounds', () => {
  it('bounds a day by the next local midnight, not by 24 hours', () => {
    const now = noon(2026, 3, 8)
    const [from, to] = rangeBounds('day', now)

    expect(dayKey(from)).toBe('2026-03-08')
    expect(dayKey(to)).toBe('2026-03-08')
    expect(to).toBe(nextDayStart(from) - 1)
  })

  it('bounds twenty-four hours by the clock, ending with today', () => {
    const now = noon(2026, 3, 8)
    const [from, to] = rangeBounds('h24', now)

    expect(from).toBe(now - 24 * 60 * 60 * 1000 + 1)
    expect(to).toBe(nextDayStart(now) - 1)
  })

  it('answers an unbounded window for all time', () => {
    const now = noon(2026, 3, 8)
    const [from, to] = rangeBounds('all', now)

    expect(from).toBe(0)
    expect(to).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('keeps a week seven calendar days long', () => {
    const now = noon(2026, 3, 12)
    const [from, to] = rangeBounds('week', now)

    expect(dayKey(from)).toBe(dayKey(addDays(now, -6)))
    expect(dayKey(to)).toBe('2026-03-12')
  })

  it('keeps a hand-picked range on its stated dates across a DST change', () => {
    const [from, to] = rangeBounds('custom', noon(2026, 3, 8), {
      from: '2026-03-07',
      to: '2026-03-09',
    })

    expect(dayKey(from)).toBe('2026-03-07')
    expect(dayKey(to)).toBe('2026-03-09')
    expect(to).toBe(nextDayStart(dayTime('2026-03-09') ?? 0) - 1)
  })

  it('falls back to today when a hand-picked range is malformed', () => {
    const now = noon(2026, 3, 8)
    const [from, to] = rangeBounds('custom', now, { from: 'nope', to: '2026-03-09' })

    expect(dayKey(from)).toBe('2026-03-08')
    expect(dayKey(to)).toBe('2026-03-08')
  })
})

describe('waveRangeOf', () => {
  it('leaves a preset range alone', () => {
    expect(waveRangeOf('year', 0, 0)).toBe('year')
  })

  it('picks the bucket ladder by the hand-picked length', () => {
    const day = dayTime('2026-03-08') ?? 0
    expect(waveRangeOf('custom', day, day)).toBe('day')
    expect(waveRangeOf('custom', day, addDays(day, 30))).toBe('month')
    expect(waveRangeOf('custom', day, addDays(day, 100))).toBe('quarter')
    expect(waveRangeOf('custom', day, addDays(day, 200))).toBe('year')
  })
})

describe('clampDay', () => {
  it('clamps a typed date into the calendar window', () => {
    expect(clampDay('2025-01-01', '2025-10-26', '2026-10-24')).toBe('2025-10-26')
    expect(clampDay('2027-01-01', '2025-10-26', '2026-10-24')).toBe('2026-10-24')
    expect(clampDay('2026-03-08', '2025-10-26', '2026-10-24')).toBe('2026-03-08')
  })
})
