import { describe, expect, it } from 'vitest'
import { draftsFrom, pendingUpdate, RATE_FIELDS } from '../src/client/rate-draft.ts'
import type { UsageRouteRate } from '../src/types.ts'

const FLASH = { input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 }
const CUSTOM = { input: 3, cacheRead: 0.3, cacheWrite: 3, output: 9 }

/** Two routes: one claimed by a rule, one the reader has already overridden. */
const ROUTES: readonly UsageRouteRate[] = [
  { route: 'p/flash-model', rate: FLASH, source: 'rule', rule: 'flash', tokens: 100 },
  { route: 'p/other-model', rate: CUSTOM, source: 'override', tokens: 50 },
]

/** Rewrite one field of one route's draft. */
function edit(route: string, field: string, value: string): ReturnType<typeof draftsFrom> {
  const drafts = draftsFrom(ROUTES)
  const row = drafts[route] as unknown as Record<string, string>
  row[field] = value
  return drafts
}

describe('draftsFrom', () => {
  it('opens on the rates in effect', () => {
    expect(draftsFrom(ROUTES)).toEqual({
      'p/flash-model': { input: '1', cacheRead: '0.02', cacheWrite: '1', output: '4' },
      'p/other-model': { input: '3', cacheRead: '0.3', cacheWrite: '3', output: '9' },
    })
  })
})

describe('pendingUpdate', () => {
  it('writes nothing when nothing was touched', () => {
    expect(pendingUpdate(draftsFrom(ROUTES), ROUTES)).toEqual({ status: 'empty' })
  })

  it('writes only the row that changed', () => {
    const result = pendingUpdate(edit('p/flash-model', 'output', '5'), ROUTES)
    expect(result).toEqual({
      status: 'ready',
      update: { set: { 'p/flash-model': { ...FLASH, output: 5 } } },
    })
  })

  it('fills the untouched buckets of a partially edited row from the rate in effect', () => {
    const result = pendingUpdate(edit('p/other-model', 'input', '7'), ROUTES)
    expect(result).toEqual({
      status: 'ready',
      update: { set: { 'p/other-model': { ...CUSTOM, input: 7 } } },
    })
  })

  it('clears an override when every field of that row is emptied', () => {
    const drafts = draftsFrom(ROUTES)
    for (const field of RATE_FIELDS) {
      (drafts['p/other-model'] as unknown as Record<string, string>)[field] = ''
    }
    expect(pendingUpdate(drafts, ROUTES)).toEqual({ status: 'ready', update: { set: { 'p/other-model': null } } })
  })

  it('asks for nothing when a blank row was never overridden', () => {
    const drafts = draftsFrom(ROUTES)
    for (const field of RATE_FIELDS) {
      (drafts['p/flash-model'] as unknown as Record<string, string>)[field] = ''
    }
    expect(pendingUpdate(drafts, ROUTES)).toEqual({ status: 'empty' })
  })

  it('names the first field that is not a price', () => {
    expect(pendingUpdate(edit('p/flash-model', 'cacheRead', 'cheap'), ROUTES))
      .toEqual({ status: 'invalid', route: 'p/flash-model', field: 'cacheRead' })
    expect(pendingUpdate(edit('p/flash-model', 'input', '-1'), ROUTES))
      .toEqual({ status: 'invalid', route: 'p/flash-model', field: 'input' })
  })

  it('treats a blank field of a partly edited row as "keep the rate in effect"', () => {
    const drafts = edit('p/flash-model', 'cacheRead', '  ')
    const row = drafts['p/flash-model']
    expect(row).toBeDefined()
    if (row === undefined) return
    row.input = '2'
    expect(pendingUpdate(drafts, ROUTES)).toEqual({
      status: 'ready',
      update: { set: { 'p/flash-model': { ...FLASH, input: 2 } } },
    })
  })

  it('asks for nothing when an overridden row is left exactly as it is', () => {
    expect(pendingUpdate(edit('p/other-model', 'output', '  '), ROUTES)).toEqual({ status: 'empty' })
  })
})
