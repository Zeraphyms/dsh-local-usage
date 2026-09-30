/**
 * The entrance's arithmetic.
 *
 * The hook beside this needs a browser; the shape of the count-up does not. What
 * is worth pinning is that it starts at nothing, ends exactly on the figure —
 * never near it, because a summarised total that lands a token short is a wrong
 * number — and gets most of the way there early, so the row reads as settling
 * rather than as climbing.
 *
 * @module dsh-local-usage/tests/count-up
 */

import { describe, expect, it } from 'vitest'
import { COUNT_UP_MS, countUpAt, easeOutCubic, entranceAt } from '../src/client/count-up.ts'

describe('easeOutCubic', () => {
  it('leaves both ends where they are', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
  })

  it('is ahead of a straight line throughout, and never past its end', () => {
    for (const progress of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(easeOutCubic(progress)).toBeGreaterThan(progress)
      expect(easeOutCubic(progress)).toBeLessThan(1)
    }
  })

  it('clamps a share from outside the entrance', () => {
    expect(easeOutCubic(-3)).toBe(0)
    expect(easeOutCubic(4)).toBe(1)
  })
})

describe('entranceAt', () => {
  it('is at the start and the end of its duration', () => {
    expect(entranceAt(0)).toBe(0)
    expect(entranceAt(COUNT_UP_MS)).toBe(1)
    expect(entranceAt(COUNT_UP_MS * 2)).toBe(1)
  })

  it('snaps to the end when there is no duration to run', () => {
    expect(entranceAt(0, 0)).toBe(1)
  })
})

describe('countUpAt', () => {
  it('lands exactly on the figure, which is the only value that matters', () => {
    expect(countUpAt(1234.56, COUNT_UP_MS)).toBe(1234.56)
    expect(countUpAt(1234.56, COUNT_UP_MS * 5)).toBe(1234.56)
  })

  it('starts at nothing', () => {
    expect(countUpAt(1234.56, 0)).toBe(0)
  })

  it('is past halfway once half the entrance has run', () => {
    expect(countUpAt(100, COUNT_UP_MS / 2)).toBeGreaterThan(50)
  })

  it('counts a zero up to zero, so an empty window does not flash a figure', () => {
    expect(countUpAt(0, COUNT_UP_MS / 3)).toBe(0)
  })
})
