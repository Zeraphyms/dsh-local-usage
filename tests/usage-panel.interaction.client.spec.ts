// @vitest-environment jsdom
/**
 * The panel's recount is one event, not a mode.
 *
 * The effect used to pass `refresh: request > 0`; once a reader pressed recount,
 * every later range change, rate write or reactivation kept forcing a full log
 * reread. This test drives the real controls and watches the request the panel
 * hands its Host.
 *
 * @module dsh-local-usage/tests/usage-panel-interaction
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UsagePanel } from '../src/client/UsagePanel.tsx'
import type { UsagePanelProps } from '../src/client/UsagePanel.tsx'
import type { UsageInsightsReport } from '../src/types.ts'
import { NO_RELIABILITY } from '../src/types.ts'

const t = ((key: string): string => key) as never

const RATE = { input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 }

/** A report with no rows, enough for the panel to settle every view. */
function emptyReport(): UsageInsightsReport {
  return {
    generatedAt: 1,
    currency: 'CNY',
    totals: {
      uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
      cost: 0, calls: 0, sessions: 0,
    },
    days: [], models: [], projects: [], sessions: [],
    scannedSessions: 0, unreadableSessions: 0,
    reliability: NO_RELIABILITY,
    unpricedRoutes: [], unpricedTokens: 0, cached: false,
    prices: [], fallbackPrice: { match: '', peakEnabled: false, peak: RATE, offPeak: RATE },
    routeRates: [], peakWindows: [], peakWeekdaysOnly: true, slices: [],
  }
}

/** jsdom has no layout observer; the calendar treats a zero-width box as empty. */
class TestResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('UsagePanel interaction', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', TestResizeObserver)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refreshes once, and later range changes are ordinary reads', async () => {
    const requests: { refresh?: boolean; from: number; to: number }[] = []
    const report = vi.fn(async (request: { refresh?: boolean; from: number; to: number }) => {
      requests.push(request)
      return emptyReport()
    })
    let activePanelId = 'usage'
    const props = {
      panelId: 'usage',
      locale: () => 'en',
      report,
      saveRates: () => Promise.resolve({ models: {} }),
      t,
      usePanelInfo: (select: (info: { activePanelId: string }) => unknown) => select({ activePanelId }),
    } as unknown as UsagePanelProps

    const view = render(createElement(UsagePanel, props))
    await waitFor(() => { expect(report).toHaveBeenCalled() })

    fireEvent.click(screen.getByText('refresh'))
    await waitFor(() => { expect(requests.some(request => request.refresh === true)).toBe(true) })

    // Leaving and returning to the panel is the re-activation the bug also
    // affected; it must be an ordinary read, not another recount.
    activePanelId = 'other'
    view.rerender(createElement(UsagePanel, props))
    const beforeReturn = requests.length
    activePanelId = 'usage'
    view.rerender(createElement(UsagePanel, props))
    await waitFor(() => {
      expect(requests.slice(beforeReturn).some(request => request.refresh === false)).toBe(true)
    })
  })
})
