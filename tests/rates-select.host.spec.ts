import { describe, expect, it } from 'vitest'
import { selectRate } from '../src/pricing.ts'
import type { PriceRate, PriceRule } from '../src/pricing.ts'

const FALLBACK: PriceRate = { input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 }
const RULES: readonly PriceRule[] = [
  { match: 'v4-pro', input: 4.5, cacheRead: 0.15, cacheWrite: 4.5, output: 13.5 },
  { match: 'flash', input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 },
]
const OVERRIDES = new Map<string, PriceRate>([
  ['ds123/glm-5.3-flash', { input: 3, cacheRead: 0.3, cacheWrite: 3, output: 9 }],
])

describe('selectRate sources', () => {
  it('reports which rule claimed a route', () => {
    expect(selectRate(RULES, FALLBACK, 'commoncode/deepseek/deepseek-v4.1-flash', false, 2))
      .toEqual({ rate: { input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 }, matched: true, source: 'rule', rule: 'flash' })
  })

  it('reports the fallback when nothing claims a route', () => {
    expect(selectRate(RULES, FALLBACK, 'input/gpt-5.6-sol', false, 2))
      .toEqual({ rate: FALLBACK, matched: false, source: 'fallback' })
  })

  it('lets an exact override outrank a rule that would otherwise match', () => {
    const selection = selectRate(RULES, FALLBACK, 'ds123/glm-5.3-flash', false, 2, OVERRIDES)
    expect(selection.source).toBe('override')
    expect(selection.rule).toBeUndefined()
    expect(selection.rate).toEqual({ input: 3, cacheRead: 0.3, cacheWrite: 3, output: 9 })
  })

  it('carries the override through the peak multiplier', () => {
    const selection = selectRate(RULES, FALLBACK, 'ds123/glm-5.3-flash', true, 2, OVERRIDES)
    expect(selection.rate).toEqual({ input: 6, cacheRead: 0.6, cacheWrite: 6, output: 18 })
  })

  it('does not claim a route whose override is for another route', () => {
    const selection = selectRate(RULES, FALLBACK, 'ds123/glm-5.3', false, 2, OVERRIDES)
    expect(selection.source).toBe('fallback')
  })
})
