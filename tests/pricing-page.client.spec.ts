/**
 * The pricing page reads the card the Host actually billed.
 *
 * A substring card such as `flash` prices routes that spell a longer model
 * name. Looking that card up by the route's model name found nothing and
 * rendered the fallback's prices beside money the Host had priced with the
 * matched card. The page is rendered here from a minimal report that carries
 * the Host's `routeRates.model`, so the assertion is about the card selection
 * rather than about a price string happening to match.
 *
 * @module dsh-local-usage/tests/pricing-page
 */

import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PricingPage } from '../src/client/PricingPage.tsx'
import type { UsageInsightsReport } from '../src/types.ts'

const t = ((key: string): string => key) as never

const RATE = { input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 }

const report = {
  currency: 'CNY',
  prices: [{
    match: 'flash',
    peakEnabled: true,
    peak: { input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 },
    offPeak: RATE,
  }],
  fallbackPrice: {
    match: '',
    peakEnabled: false,
    peak: { input: 9, cacheRead: 0.9, cacheWrite: 9, output: 9 },
    offPeak: { input: 9, cacheRead: 0.9, cacheWrite: 9, output: 9 },
  },
  models: [{ route: 'vendor/deepseek-v4.1-flash', cost: 1, tokens: 100, calls: 1 }],
  routeRates: [{
    route: 'vendor/deepseek-v4.1-flash',
    model: 'flash',
    detected: 'deepseek-v4.1-flash',
    peakEnabled: true,
    peak: { input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8 },
    offPeak: RATE,
    source: 'model',
    tokens: 100,
  }],
  generatedAt: 1,
  scannedSessions: 1,
  unreadableSessions: 0,
  cached: true,
  unpricedRoutes: [],
} as unknown as UsageInsightsReport

describe('the pricing page and the effective card', () => {
  it('shows the matched card rather than the fallback', () => {
    const markup = renderToStaticMarkup(createElement(PricingPage, {
      report,
      weeks: 52,
      locale: 'en',
      t,
      formatCost: (value: number) => `$${value.toFixed(2)}`,
      onSaveRates: () => Promise.resolve(),
      onBack: () => {},
    }))

    // The row is priced, so it must not carry the inherited-default badge the
    // page adds when no card owns the model.
    expect(markup).not.toContain('pricingInherited')
    expect(markup).toContain('flash')
  })
})
