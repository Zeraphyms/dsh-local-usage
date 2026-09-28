import { describe, expect, it } from 'vitest'
import { barFraction, rankProjects } from '../src/client/ranking.ts'
import { tokensOf } from '../src/client/tokens.ts'
import type { UsageProjectRow } from '../src/types.ts'

/** A project row with only the fields the ranking reads. */
function project(path: string, input: number, output: number, cost: number, sessions = 1): UsageProjectRow {
  return {
    path,
    uncachedInputTokens: input,
    outputTokens: output,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    cost,
    calls: 0,
    sessions,
  }
}

describe('tokensOf', () => {
  it('sums the four disjoint buckets', () => {
    expect(tokensOf({ uncachedInputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 })).toBe(10)
  })
})

describe('rankProjects', () => {
  it('orders by token volume, not by cost', () => {
    const ranked = rankProjects([
      project('cheap-but-huge', 1_000_000, 0, 1),
      project('pricey-but-small', 10, 0, 900),
    ])
    expect(ranked.map(row => row.path)).toEqual(['cheap-but-huge', 'pricey-but-small'])
  })

  it('breaks a tie on cost, then on path, so the order is stable', () => {
    const ranked = rankProjects([
      project('b', 100, 0, 1),
      project('a', 100, 0, 1),
      project('c', 100, 0, 5),
    ])
    expect(ranked.map(row => row.path)).toEqual(['c', 'a', 'b'])
  })

  it('does not mutate the report it was given', () => {
    const rows = [project('a', 1, 0, 1), project('b', 2, 0, 1)]
    rankProjects(rows)
    expect(rows.map(row => row.path)).toEqual(['a', 'b'])
  })
})

describe('barFraction', () => {
  it('scales the leader to a full bar', () => {
    const leader = project('top', 400, 0, 1)
    expect(barFraction(leader, leader)).toBe(1)
    expect(barFraction(project('half', 200, 0, 1), leader)).toBe(0.5)
  })

  it('states nothing when there is no volume to scale against', () => {
    expect(barFraction(project('a', 10, 0, 1), undefined)).toBeUndefined()
    expect(barFraction(project('a', 10, 0, 1), project('zero', 0, 0, 0))).toBeUndefined()
  })
})
