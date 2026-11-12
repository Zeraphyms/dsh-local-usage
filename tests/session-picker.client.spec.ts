// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { useCallsQuery } from '../src/client/useCallsQuery.ts'
import { StatsTables } from '../src/client/StatsTables.tsx'
import type { StatsTablesProps } from '../src/client/StatsTables.tsx'
import type { UsageSessionFacet } from '../src/types.ts'
import { normalizeReport } from '../src/client/wire-report.ts'

const chainId = 'chain:' + 'c'.repeat(64)
function respond(sessionFacets: UsageSessionFacet[]): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ sessionFacets }))))
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('conversation selection', () => {
  it('uses Host groups directly and retains separate duplicate and missing titles', async () => {
    respond([
      { sessionId: 'root', chainId, chainSessionIds: ['root', 'fork'], title: 'Duplicate', calls: 3, cost: 3 },
      { sessionId: 'independent', title: 'Duplicate', calls: 1, cost: 2 },
      { sessionId: 'untitled-a', calls: 1, cost: 1 },
      { sessionId: 'untitled-b', calls: 1, cost: 1 },
    ])
    const { result } = renderHook(() => useCallsQuery({}))
    await waitFor(() => { expect(result.current.sessionChainOptions).toHaveLength(4) })
    expect(result.current.sessionChainOptions.map(option => option.value)).toEqual([chainId, 'independent', 'untitled-a', 'untitled-b'])
    act(() => { result.current.chooseSession(chainId) })
    await waitFor(() => {
      expect(vi.mocked(fetch).mock.calls.some(([url]) => new URL(String(url)).searchParams.get('session') === chainId)).toBe(true)
    })
  })

  it('does not infer a chain from titles when an older Host omits chain metadata', async () => {
    respond(['a', 'b'].map(sessionId => ({ sessionId, title: 'Same', calls: 1, cost: 1 })))
    const { result } = renderHook(() => useCallsQuery({}))
    await waitFor(() => { expect(result.current.sessionChainOptions).toHaveLength(2) })
    expect(result.current.sessionChainOptions.map(option => option.value)).toEqual(['a', 'b'])
  })

  it('opens a long chain from the stats table with one compact id', () => {
    const ids = Array.from({ length: 100 }, (_, index) => 'session-' + String(index).padStart(36, '0'))
    const row = {
      sessionId: ids[0]!, chainId, chainSessionIds: ids, title: 'Conversation',
      createdAt: 1, updatedAt: 2, calls: 100, cost: 1,
      uncachedInputTokens: 10, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0,
    }
    const open = vi.fn()
    const props = {
      report: normalizeReport({ sessions: [row] } as never),
      t: ((key: string) => key) as StatsTablesProps['t'], formatCost: String, formatInteger: String,
      onOpenCalls: open,
    }
    const view = render(createElement(StatsTables, props))
    fireEvent.click(view.getByText('Conversation'))
    expect(open).toHaveBeenCalledWith(chainId)
    expect(chainId.length).toBeLessThan(100)
  })
})
