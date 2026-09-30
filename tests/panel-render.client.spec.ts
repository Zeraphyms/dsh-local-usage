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
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { UsagePanel } from '../src/client/UsagePanel.tsx'
import type { UsagePanelProps } from '../src/client/UsagePanel.tsx'
import { Popover } from '../src/client/Popover.tsx'
import { RateEditor } from '../src/client/RateEditor.tsx'
import type { UsageRouteRate } from '../src/types.ts'

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
