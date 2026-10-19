/**
 * The window's routes read as the models they are.
 *
 * Pricing is stated per model, so the usage beside it is read that way too: one
 * row per model, its routes beneath it, one volume for the model as a whole. What
 * is pinned here is that the sum is the routes' sum, that the group keeps the
 * routes it is the sum of, and that a route the fallback priced is not silently
 * merged into a model.
 */

import { describe, expect, it } from 'vitest'
import { groupRouteUsage } from '../src/client/route-models.ts'
import type { UsageRouteRate } from '../src/types.ts'

/** One route row with only the fields the grouping reads. */
function route(name: string, model: string | undefined, tokens: number): UsageRouteRate {
  return {
    route: name,
    ...model === undefined ? {} : { model },
    peakEnabled: true,
    peak: { input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 },
    offPeak: { input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 },
    source: model === undefined ? 'fallback' : 'model',
    tokens,
  }
}

describe('groupRouteUsage', () => {
  it('sums the routes of one model into a single row', () => {
    const groups = groupRouteUsage([
      route('vendor-a/flash', 'flash', 300),
      route('vendor-b/cn:flash', 'flash', 200),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.model).toBe('flash')
    expect(groups[0]?.tokens).toBe(500)
    // The routes survive the sum: they are what makes an aggregator's markup visible.
    expect(groups[0]?.routes.map(row => row.route)).toEqual(['vendor-a/flash', 'vendor-b/cn:flash'])
  })

  it('orders models by volume, and their routes within them', () => {
    const groups = groupRouteUsage([
      route('a/small', 'small', 10),
      route('a/big', 'big', 400),
      route('b/big', 'big', 100),
    ])

    expect(groups.map(group => group.model)).toEqual(['big', 'small'])
    expect(groups[0]?.routes.map(row => row.route)).toEqual(['a/big', 'b/big'])
  })

  it('keeps the routes no model claimed in a group of their own', () => {
    const groups = groupRouteUsage([route('input/gpt', undefined, 50), route('a/flash', 'flash', 10)])

    expect(groups.map(group => group.model)).toEqual([undefined, 'flash'])
    expect(groups[0]?.tokens).toBe(50)
  })

  it('answers nothing for a window with no routes', () => {
    expect(groupRouteUsage([])).toEqual([])
  })
})
