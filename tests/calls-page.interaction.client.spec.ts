// @vitest-environment jsdom
/**
 * The call log's controls drive the Host query.
 *
 * The page is a query surface, not a client-side filter: changing a control must
 * reach the Host as URL parameters and leave the row count to the answer. This
 * test pins the model filter and the page size, the two controls most likely to
 * be wired to local state only.
 *
 * @module dsh-local-usage/tests/calls-page-interaction
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CallsPage } from '../src/client/CallsPage.tsx'
import type { UsageCallsReport } from '../src/types.ts'

const t = ((key: string): string => key) as never

function page(): UsageCallsReport {
  return {
    generatedAt: 1,
    currency: 'CNY',
    rows: [{
      id: 's:1', time: Date.now(), sessionId: 'session-12345678', title: 'Alpha task',
      cwd: '/work/alpha', route: 'p/m', model: 'm', provider: 'p',
      tokens: { uncachedInputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 0 },
      cost: 0.01, priced: true,
    }],
    total: 1, offset: 0, limit: 50,
    totals: {
      uncachedInputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 0,
      cost: 0.01, calls: 1,
    },
    routes: [{
      route: 'p/m', model: 'm', provider: 'p', calls: 1,
      tokens: 6, cost: 0.01,
    }],
    sessionFacets: [{
      sessionId: 'session-12345678', title: 'Alpha task', calls: 1, cost: 0.01,
    }],
    projectFacets: [{
      path: '/work/alpha', calls: 1, cost: 0.01,
    }],
    sessions: 1, projects: 1, scannedSessions: 1, unreadableSessions: 0, cached: true,
  }
}

describe('CallsPage interaction', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(page()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** The three selects in the query bar, in reading order. */
  function selectAt(container: HTMLElement, index: number): HTMLSelectElement {
    const select = container.querySelectorAll<HTMLSelectElement>('select')[index]
    if (select === undefined) throw new Error(`no select at ${String(index)}`)
    return select
  }

  function props(): Record<string, unknown> {
    return {
      locale: 'en',
      t,
      formatCost: (value: number) => `$${value.toFixed(2)}`,
      formatTokens: (value: number) => String(value),
      formatInteger: (value: number) => String(value),
      formatPercent: (value: number) => `${(value * 100).toFixed(2)}%`,
      onBack: () => {},
    }
  }

  it('sends the chosen model to the Host', async () => {
    const view = render(createElement(CallsPage, props() as never))
    await screen.findByText('Alpha task')

    fireEvent.change(selectAt(view.container, 0), { target: { value: 'm' } })

    await waitFor(() => {
      const calls = (fetch as unknown as { mock: { calls: [URL][] } }).mock.calls
      expect(calls.some(([url]) => String(url).includes('model=m'))).toBe(true)
    })
  })

  it('sends a new page size without reparsing the rows locally', async () => {
    const view = render(createElement(CallsPage, props() as never))
    await screen.findByText('Alpha task')

    fireEvent.change(selectAt(view.container, 2), { target: { value: '100' } })

    await waitFor(() => {
      const calls = (fetch as unknown as { mock: { calls: [URL][] } }).mock.calls
      expect(calls.some(([url]) => String(url).includes('limit=100'))).toBe(true)
    })
  })
})
