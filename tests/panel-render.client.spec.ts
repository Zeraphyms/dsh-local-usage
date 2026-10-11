/**
 * What the panel's chrome does before its data arrives.
 *
 * The bug these exist for: the two header panels — the rate editor and the
 * provenance notes — were not rendered at all until the year's report landed. On
 * its own that was invisible, because the rest of the page was obviously still
 * loading. Once the loading frame started drawing the real layout it stopped
 * being invisible: a reader looking at a page that appears finished sees two
 * controls that are simply gone, and reports a feature as removed.
 *
 * So the rule pinned here is about *presence*, not about behaviour: every control
 * the header owns is in the header in every state, and a control that has nothing
 * to show says so instead of disappearing.
 *
 * Rendered with `react-dom/server`, which runs no effects — that is exactly the
 * state under test, since the panel's data arrives through one.
 *
 * @module dsh-local-usage/tests/panel-render
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { UsagePanel } from '../src/client/UsagePanel.tsx'
import type { UsagePanelProps } from '../src/client/UsagePanel.tsx'
import { BreakdownPage } from '../src/client/BreakdownPage.tsx'
import { DayDetail } from '../src/client/DayDetail.tsx'
import { Popover } from '../src/client/Popover.tsx'
import { RateEditor } from '../src/client/RateEditor.tsx'
import type { UsageInsightsReport, UsageRouteRate } from '../src/types.ts'

/** A translate function that names its key, so markup can be searched for one. */
const t = ((key: string, params?: Record<string, string>): string =>
  params === undefined ? key : `${key}(${Object.values(params).join(',')})`) as never

/** The panel's props with everything injected, and no report until one is asked for. */
function panelProps(): UsagePanelProps {
  return {
    panelId: 'usage',
    locale: () => 'en',
    report: () => new Promise(() => {}),
    saveRates: () => Promise.resolve({ overrides: {} }),
    t,
    // The slot hook, called through rather than subscribed to.
    usePanelInfo: (select: (info: { activePanelId: string }) => unknown) =>
      select({ activePanelId: 'usage' }),
  } as unknown as UsagePanelProps
}

/** One route the rate editor can offer. */
function route(routeName: string): UsageRouteRate {
  return {
    route: routeName,
    rate: { input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 },
    source: 'fallback',
    tokens: 100,
  }
}

describe('the panel before its report arrives', () => {
  const markup = renderToStaticMarkup(createElement(UsagePanel, panelProps()))

  it('keeps the rate panel in the header, inert rather than absent', () => {
    expect(markup).toContain('aria-label="pricingTitle"')
    expect(markup).toContain('data-disabled="true"')
    expect(markup).toContain('aria-expanded="false"')
  })

  it('keeps the provenance panel there beside it', () => {
    expect(markup).toContain('aria-label="dataTitle"')
  })

  it('keeps the recount button, which was already always present', () => {
    expect(markup).toContain('refresh')
  })

  it('draws the loading frame rather than a page that looks finished', () => {
    expect(markup).toContain('dlu-cellGhost')
    expect(markup).toContain('role="progressbar"')
  })
})

describe('a popover with data behind it', () => {
  it('is live and carries its content once it has something to show', () => {
    const markup = renderToStaticMarkup(createElement(Popover, {
      id: 'x',
      label: 'label',
      hint: 'hint',
      icon: null,
      children: createElement('p', null, 'body'),
    }))

    expect(markup).toContain('aria-disabled="false"')
    expect(markup).toContain('data-disabled="false"')
    // Mounted while closed, so a pinned panel keeps half-typed fields.
    expect(markup).toContain('body')
  })
})

describe('a day whose total is large', () => {
  /** The day page renders its hero from a report, so it can be asked for any figure. */
  const dayBase = {
    day: '2026-09-28',
    t,
    formatTokens: String,
    formatInteger: String,
    formatPercent: String,
    formatDay: String,
    weekdayOf: String,
    onRetry: () => {},
    onBack: () => {},
  }

  /** A day report carrying one total. */
  function dayReport(cost: number): UsageInsightsReport {
    return {
      totals: { cost, uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, calls: 1 },
      projects: [],
      peakMultiplier: 2,
    } as unknown as UsageInsightsReport
  }

  it('sets an everyday total at the headline size', () => {
    const markup = renderToStaticMarkup(createElement(DayDetail, {
      ...dayBase,
      formatCost: (value: number) => `¥${value.toFixed(2)}`,
      report: dayReport(12.5),
      failed: false,
    }))

    expect(markup).toContain('data-room="normal"')
  })

  it('steps a large total down rather than letting it widen the strip', () => {
    const markup = renderToStaticMarkup(createElement(DayDetail, {
      ...dayBase,
      // The formatter is the panel's; this supplies the shape a total takes in a
      // currency with no symbol configured, which is the longest one reachable.
      formatCost: (value: number) => `CNY ${value.toLocaleString('en')}`,
      report: dayReport(1_234_567.89),
      failed: false,
    }))

    expect(markup).toContain('data-room="overflowing"')
  })
})

describe('the stylesheet keeps the layout a function of the panel, not of the data', () => {
  const css = readFileSync('src/client/styles.ts', 'utf8')

  it('measures the panel so its contents can be laid out by its width', () => {
    expect(css).toContain('container-type: inline-size')
  })

  it('gives the tiles a column count of their own, never one the figures decide', () => {
    // The bug this guards: with an auto-fitting grid, a wider total in the hero
    // left the tiles less room and pushed one onto another row, which changed
    // the strip's height and moved the calendar below it.
    expect(css).not.toContain('repeat(auto-fit, minmax(96px, 1fr))')
    expect(css).toContain('repeat(7, minmax(0, 1fr))')
  })
})

describe('the rate editor', () => {
  const base = {
    currency: 'CNY',
    t,
    formatTokens: String,
    onSave: () => Promise.resolve(),
  }

  it('states an empty window instead of vanishing from the panel', () => {
    const markup = renderToStaticMarkup(createElement(RateEditor, { ...base, routes: [] }))

    expect(markup).toContain('pricingEditorTitle')
    expect(markup).toContain('pricingEditorEmpty')
  })

  it('offers a row per route once the window recorded some', () => {
    const markup = renderToStaticMarkup(createElement(RateEditor, {
      ...base,
      routes: [route('p/m'), route('q/m')],
    }))

    expect(markup).toContain('pricingEditorHint')
    expect(markup).not.toContain('pricingEditorEmpty')
    expect(markup).toContain('p/m')
    expect(markup).toContain('q/m')
  })
})

describe('the range detail view', () => {
  /** A report with one of everything the page draws. */
  function fullReport(): UsageInsightsReport {
    return {
      generatedAt: 0,
      currency: 'CNY',
      totals: {
        cost: 12, uncachedInputTokens: 100, outputTokens: 10, cacheReadTokens: 5,
        cacheWriteTokens: 1, calls: 4, sessions: 2,
      },
      days: [
        { day: '2026-09-21', cost: 12, calls: 4, sessions: 2, uncachedInputTokens: 100, outputTokens: 10, cacheReadTokens: 5, cacheWriteTokens: 1 },
      ],
      models: [
        { route: 'demo/flash', priced: true, cost: 12, calls: 4, uncachedInputTokens: 100, outputTokens: 10, cacheReadTokens: 5, cacheWriteTokens: 1 },
      ],
      projects: [],
      sessions: [
        { sessionId: 's1', title: 'a conversation', cwd: '/Users/demo/work/atlas-web', cost: 12, calls: 4, updatedAt: 0, createdAt: 0, uncachedInputTokens: 100, outputTokens: 10, cacheReadTokens: 5, cacheWriteTokens: 1 },
      ],
      scannedSessions: 1,
      unreadableSessions: 0,
      reliability: { retries: 0, retryCauses: [], toolCalls: 0, toolErrors: 0, toolErrorCodes: [], compactions: 0, compactionFailures: 0 },
      unpricedRoutes: [],
      unpricedTokens: 0,
      cached: true,
      peakMultiplier: 2,
      prices: [],
      fallbackPrice: { match: '', input: 1, cacheRead: 0, cacheWrite: 1, output: 4 },
      routeRates: [],
      peakWindows: ['09:00-12:00'],
      peakWeekdaysOnly: true,
      peak: { peakCost: 8, offPeakCost: 4, premium: 4, peakCalls: 3, offPeakCalls: 1 },
      cache: { readCost: 0.1, inputCost: 5, saved: 4.9 },
      hourly: Array.from({ length: 24 }, (_, hour) => ({ hour, cost: hour === 10 ? 12 : 0, calls: hour === 10 ? 4 : 0, tokens: 0 })),
      previous: {
        from: 0,
        to: 0,
        totals: { cost: 6, uncachedInputTokens: 50, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0, calls: 2, sessions: 1 },
      },
    } as unknown as UsageInsightsReport
  }

  const base = {
    rangeLabel: 'This year',
    failed: false,
    t,
    formatCost: (value: number) => `CNY ${value.toFixed(2)}`,
    formatTokens: String,
    formatInteger: String,
    formatPercent: (value: number) => `${(value * 100).toFixed(2)}%`,
    formatDay: String,
    onBack: () => {},
    onRetry: () => {},
  }

  it('keeps its frame, and a way out, before the report arrives', () => {
    // A page that exists to be left: if the fold is slow, the reader must not be
    // trapped on a page with no back control.
    const markup = renderToStaticMarkup(createElement(BreakdownPage, {
      ...base,
      report: undefined,
      failed: false,
    }))

    expect(markup).toContain('dlu-breakdown')
    expect(markup).toContain('back')
    expect(markup).toContain('role="status"')
  })

  it('states a failed fold without dropping the frame', () => {
    const markup = renderToStaticMarkup(createElement(BreakdownPage, {
      ...base,
      report: undefined,
      failed: true,
    }))

    expect(markup).toContain('role="alert"')
    expect(markup).toContain('dlu-breakdown')
  })

  it('draws the attribution, the composition and the timing from the folds', () => {
    const markup = renderToStaticMarkup(createElement(BreakdownPage, { ...base, report: fullReport() }))

    // By route, with the route it was billed on.
    expect(markup).toContain('demo/flash')
    // What the peak schedule cost, and what caching was worth, in money.
    expect(markup).toContain('CNY 8.00')
    expect(markup).toContain('CNY 4.00')
    expect(markup).toContain('CNY 4.90')
    // The session list, by its folded title.
    expect(markup).toContain('a conversation')
    // The comparison against the window before it.
    expect(markup).toContain('CNY 6.00')
    // An export the reader can take away.
    expect(markup).toContain('breakdownExportAction')
  })

  it('says the comparison is missing rather than comparing against nothing', () => {
    const report = { ...fullReport() } as Record<string, unknown>
    delete report.previous
    const markup = renderToStaticMarkup(createElement(BreakdownPage, {
      ...base,
      report: report as unknown as UsageInsightsReport,
    }))

    expect(markup).toContain('breakdownCompareUnavailable')
  })

  it('draws no hour profile when the Host folded none', () => {
    const report = { ...fullReport(), hourly: [] }
    const markup = renderToStaticMarkup(createElement(BreakdownPage, { ...base, report }))

    expect(markup).not.toContain('breakdownByHour')
  })
})
