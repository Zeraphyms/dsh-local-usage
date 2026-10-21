/**
 * The calendar shade ramp without a browser.
 *
 * The ramp is the one part of the calendar that is arithmetic rather than
 * layout: quantiles over active days and a level per token total. These cases
 * pin the boundaries a cell sits on, including the empty window that must not
 * divide by zero.
 *
 * @module dsh-local-usage/tests/heatmap-shade
 */

import { describe, expect, it } from 'vitest'
import { quantile, shadeLevel, shadeLevels, tokensOf } from '../src/client/heatmap-shade.ts'
import type { UsageDayRow } from '../src/types.ts'

/** One day row with the given token total split across the buckets. */
function day(tokens: number): UsageDayRow {
  return {
    day: '2026-09-21',
    cost: 0,
    calls: 1,
    sessions: 1,
    uncachedInputTokens: tokens,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  }
}

describe('tokensOf', () => {
  it('adds every token bucket', () => {
    expect(tokensOf({
      ...day(0),
      uncachedInputTokens: 1,
      outputTokens: 2,
      cacheReadTokens: 3,
      cacheWriteTokens: 4,
    })).toBe(10)
  })
})

describe('quantile', () => {
  it('interpolates between ranked values', () => {
    expect(quantile([0, 10, 20, 30], 0.5)).toBe(15)
    expect(quantile([5], 0.9)).toBe(5)
    expect(quantile([], 0.5)).toBe(0)
  })
})

describe('shadeLevels', () => {
  it('ignores quiet days and takes quantiles over active ones', () => {
    const levels = shadeLevels([day(0), day(10), day(20), day(30), day(40)])
    expect(levels.t1).toBe(25)
    expect(levels.t2).toBe(32.5)
    expect(levels.t3).toBe(37)
  })

  it('answers zero thresholds for an empty window', () => {
    expect(shadeLevels([])).toEqual({ t1: 0, t2: 0, t3: 0 })
  })
})

describe('shadeLevel', () => {
  it('puts the threshold values on the lower level and the next value above', () => {
    const levels = { t1: 10, t2: 20, t3: 30 }
    expect(shadeLevel(0, levels)).toBe(0)
    expect(shadeLevel(10, levels)).toBe(1)
    expect(shadeLevel(11, levels)).toBe(2)
    expect(shadeLevel(21, levels)).toBe(3)
    expect(shadeLevel(31, levels)).toBe(4)
  })
})
