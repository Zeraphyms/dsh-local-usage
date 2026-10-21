/**
 * The call-log page before its first page arrives.
 *
 * Rendered with `react-dom/server`, which runs no effects — exactly the state
 * under test, because the log arrives through one. The rule pinned here is that
 * the page states what it is: the query controls exist before any row does, the
 * back control names where it goes, and the wait is drawn as the table's own
 * columns rather than as a sentence that leaves the page looking finished.
 *
 * @module dsh-local-usage/tests/calls-page
 */

import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CallsPage } from '../src/client/CallsPage.tsx'
import type { CallsPageProps } from '../src/client/CallsPage.tsx'

/** A translate function that names its key, so markup can be searched for one. */
const t = ((key: string, params?: Record<string, string>): string =>
  params === undefined ? key : `${key}(${Object.values(params).join(',')})`) as never

/** The page's props with the formatters stated and no fetch in flight. */
function props(overrides: Partial<CallsPageProps> = {}): CallsPageProps {
  return {
    locale: 'en',
    t,
    formatCost: value => `$${value.toFixed(2)}`,
    formatTokens: value => String(value),
    formatInteger: value => String(value),
    formatPercent: value => `${(value * 100).toFixed(2)}%`,
    onBack: () => {},
    ...overrides,
  } as CallsPageProps
}

describe('the call log before its first page', () => {
  const markup = renderToStaticMarkup(createElement(CallsPage, props()))

  it('offers every filter the query accepts', () => {
    expect(markup).toContain('callsFilterRange')
    expect(markup).toContain('callsFilterModel')
    expect(markup).toContain('callsSearch')
    expect(markup).toContain('callsSort')
    expect(markup).toContain('callsPageSize')
    expect(markup).toContain('rangeCustom')
    expect(markup).toContain('callsRangeAll')
  })

  it('draws the table it is waiting for rather than a blank page', () => {
    expect(markup).toContain('dlu-callSkeletonRow')
    expect(markup).toContain('dlu-callTable')
  })

  it('names the way back after where it came from', () => {
    const fromCalendar = renderToStaticMarkup(createElement(CallsPage, props()))
    expect(fromCalendar).toContain('>back<')

    const fromDay = renderToStaticMarkup(createElement(CallsPage, props({ backLabel: 'backToDay' })))
    expect(fromDay).toContain('>backToDay<')
  })

  it('opens on the week by default and on the sent day when one is given', () => {
    const day = new Date(2026, 7, 15).getTime()
    const opened = renderToStaticMarkup(createElement(CallsPage, props({
      initialFrom: day,
      initialTo: day + 86_400_000 - 1,
    })))

    // The hand-picked range is selected, so its two date fields are on screen.
    expect(opened).toContain('type="date"')
    expect(opened).toContain('2026-08-15')
  })
})
