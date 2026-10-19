/**
 * The window's routes read as the models they are.
 *
 * This is the rule the pricing page is built on, tested against the routes a real
 * profile reports: one model sold through four vendors, one model written with and
 * without hyphens, one fast tier of a model, and a handful that match nothing. The
 * route strings here are the ones the issue was filed with.
 */

import { describe, expect, it } from 'vitest'
import { displayModel, modelKey, modelOf } from '../src/model-name.ts'
import { groupRouteUsage } from '../src/client/route-models.ts'
import type { UsageRouteRate } from '../src/types.ts'

/** One route row, with the model its own vendor wrote in it. */
function route(name: string, tokens: number): UsageRouteRate {
  return {
    route: name,
    detected: modelOf(name),
    peakEnabled: true,
    peak: { input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 },
    offPeak: { input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 },
    source: 'fallback',
    tokens,
  }
}

describe('modelOf', () => {
  it('takes the model out of the vendor prefix and namespace', () => {
    expect(modelOf('commoncode/deepseek/deepseek-v4.1-flash')).toBe('deepseek-v4.1-flash')
    expect(modelOf('workbuddy/cn:deepseek-v4.1-flash')).toBe('deepseek-v4.1-flash')
    expect(modelOf('deepseek-official/deepseek-flash')).toBe('deepseek-flash')
    expect(modelOf('input/gpt-5.6-sol')).toBe('gpt-5.6-sol')
  })
})

describe('modelKey', () => {
  it('folds case and punctuation, so spellings of one model agree', () => {
    expect(modelKey('glm-5.3')).toBe(modelKey('glm5.3'))
    expect(modelKey('GLM-5.3')).toBe(modelKey('glm5.3'))
  })

  it('drops a trailing serving tier', () => {
    expect(modelKey('deepseek-v4.1-flash-fast')).toBe(modelKey('deepseek-v4.1-flash'))
  })
})

describe('displayModel', () => {
  it('shows the spelling with separators rather than the slug', () => {
    expect(displayModel(['glm5.3', 'glm-5.3'])).toBe('glm-5.3')
  })

  it('prefers the model name over its fast tier', () => {
    expect(displayModel(['deepseek-v4.1-flash-fast', 'deepseek-v4.1-flash'])).toBe('deepseek-v4.1-flash')
  })
})

describe('groupRouteUsage', () => {
  it('collapses every vendor route of one model into one row', () => {
    const groups = groupRouteUsage([
      route('commoncode/deepseek/deepseek-v4.1-flash', 300),
      route('workbuddy/cn:deepseek-v4.1-flash', 200),
      route('cmd/deepseek/deepseek-v4.1-flash-fast', 100),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.model).toBe('deepseek-v4.1-flash')
    expect(groups[0]?.tokens).toBe(600)
    expect(groups[0]?.routes).toHaveLength(3)
  })

  it('treats hyphenated and unhyphenated spellings as one model', () => {
    const groups = groupRouteUsage([route('ag/glm-5.3', 10), route('ag/glm5.3', 5)])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.model).toBe('glm-5.3')
    expect(groups[0]?.tokens).toBe(15)
  })

  it('keeps every distinct model its own row, dearest first', () => {
    const groups = groupRouteUsage([
      route('input/gpt-5.6-sol', 50),
      route('ds123/grok-4.6', 400),
      route('workbuddy/cn:kimi-k3-1', 100),
    ])

    expect(groups.map(group => group.model)).toEqual(['grok-4.6', 'kimi-k3-1', 'gpt-5.6-sol'])
  })

  it('answers nothing for a window with no routes', () => {
    expect(groupRouteUsage([])).toEqual([])
  })
})
