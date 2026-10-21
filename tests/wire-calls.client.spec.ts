/**
 * The call log's wire defaults.
 *
 * The browser half is served from disk while the Host half only changes on a
 * restart, so a new Client can read an answer from a Host that has never heard of
 * the call log, or from one that predates a field. The table must stay total over
 * the declared shape: a missing page is an empty log, not a render-time throw
 * that blanks the panel.
 *
 * @module dsh-local-usage/tests/wire-calls
 */

import { describe, expect, it } from 'vitest'
import { normalizeCallsReport } from '../src/client/wire-calls.ts'

describe('normalizeCallsReport', () => {
  it('turns an answer from an older Host into an empty page', () => {
    const page = normalizeCallsReport({})

    expect(page.rows).toEqual([])
    expect(page.total).toBe(0)
    expect(page.limit).toBe(50)
    expect(page.totals).toEqual({
      uncachedInputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      cost: 0,
      calls: 0,
    })
    expect(page.routes).toEqual([])
    expect(page.cached).toBe(false)
  })

  it('fills token buckets a row arrived without', () => {
    const page = normalizeCallsReport({
      rows: [{
        id: 's:1',
        time: 1,
        sessionId: 's',
        route: 'p/m',
        model: 'm',
        provider: 'p',
        cost: 0.5,
        priced: true,
      } as never],
    })

    expect(page.rows[0]?.tokens).toEqual({
      uncachedInputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    })
    expect(page.rows[0]?.cost).toBe(0.5)
  })
})
