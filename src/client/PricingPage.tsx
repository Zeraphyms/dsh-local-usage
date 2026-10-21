/**
 * The prices, and what they are computed over, on a page of their own.
 *
 * These were hover panels beside the figures. A hover is the wrong gesture for
 * this material: the reader comes here to *type* prices, and a panel that closes
 * when the pointer leaves it cannot be typed into — every field it holds is one
 * slip away from being dismissed. A page keeps its state, takes the width the
 * eight field columns need, and matches the day view this panel already has.
 *
 * Three sections, in the order a reader needs them: what the figure means, the
 * cards they can correct, and the routes those cards price — normalized by model,
 * because that is the unit pricing is stated in.
 *
 * @module dsh-local-usage/client/PricingPage
 */

import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageInsightsReport, UsagePricingUpdate } from '../types.ts'
import { DataSourceNotes } from './DataSourceNotes.tsx'
import { RateEditor } from './RateEditor.tsx'
import type { RateRow } from './rate-row.ts'
import { displayModel, modelOf } from '../model-name.ts'
import { matchModel } from '../pricing.ts'
import { css } from './classes.ts'

/** Props for the pricing page. */
export interface PricingPageProps {
  /** The year's report: prices and route volumes are read from it. */
  readonly report: UsageInsightsReport
  /** Week columns the calendar spans, stated in the provenance section. */
  readonly weeks: number
  /** Active locale id, for the grouped counts. */
  readonly locale: string
  readonly t: PropsLocale<'usage'>['t']
  /** Cost formatter, for each model's own spend. */
  readonly formatCost: (value: number) => string
  /** Persist one change to the model prices. */
  readonly onSaveRates: (update: UsagePricingUpdate) => Promise<void>
  /** Leave the page and return to the calendar. */
  readonly onBack: () => void
}

/**
 * Render the pricing page.
 * @param props - the report, the dictionary, the formatters and the controls.
 * @returns the page.
 */
export function PricingPage({
  report, weeks, locale, t, formatCost, onSaveRates, onBack,
}: PricingPageProps): ReactNode {
  // Group by the card that actually priced each route, not by the model name
  // the route spells. A substring card named `flash` is the card in effect for
  // `vendor/deepseek-v4-flash`; looking it up by full model name found nothing
  // and showed the fallback's prices beside money the Host had priced otherwise.
  const costByRoute = new Map(report.models.map(row => [row.route, row.cost]))
  const groups = new Map<string, {
    readonly card: (typeof report.prices)[number]
    readonly names: Set<string>
    tokens: number
    cost: number
    routes: number
  }>()
  for (const route of report.routeRates) {
    const match = route.model ?? ''
    const card = match.length === 0
      ? route.source === 'fallback'
        ? report.fallbackPrice
        : matchModel(report.prices, report.fallbackPrice, route.route).card
      : report.prices.find(candidate => candidate.match === match) ?? report.fallbackPrice
    const key = card.match
    const group = groups.get(key)
    const name = route.detected !== undefined && route.detected.length > 0
      ? route.detected
      : modelOf(route.route)
    if (group === undefined) {
      groups.set(key, {
        card,
        names: new Set([name]),
        tokens: route.tokens,
        cost: costByRoute.get(route.route) ?? 0,
        routes: 1,
      })
    } else {
      group.names.add(name)
      group.tokens += route.tokens
      group.cost += costByRoute.get(route.route) ?? 0
      group.routes += 1
    }
  }
  const rows: RateRow[] = [...groups.values()]
    .map(group => {
      const names = [...group.names]
      return {
        card: group.card,
        // A card that prices several models is named by its own match; one
        // model's card keeps the model's cleanest spelling.
        ...names.length === 1 && group.card.match !== ''
          ? { name: displayModel(names) }
          : {},
        tokens: group.tokens,
        cost: group.cost,
        routes: group.routes,
        inherited: group.card.match === '',
      }
    })
    .sort((left, right) => right.cost - left.cost || right.tokens - left.tokens)

  return (
    <section className={css.pricingPage} aria-label={t('pricingTitle')}>
      <header className={css.dayHeader}>
        <div className={css.headerText}>
          <div className={css.dayTitleRow}>
            <Button variant="outline" size="sm" onClick={onBack}>{t('back')}</Button>
            <h2 className={css.dayTitle}>{t('pricingTitle')}</h2>
          </div>
          <p className={css.subtitle}>{t('pricingPageSubtitle')}</p>
        </div>
      </header>

      <RateEditor
        rows={rows}
        currency={report.currency}
        formatCost={formatCost}
        t={t}
        onSave={onSaveRates}
      />

      {/* Reference material, folded away: it is read once and must not compete
        * with the prices above it. */}
      <details className={css.pricingSection}>
        <summary className={css.pricingSummary}>{t('dataTitle')}</summary>
        <DataSourceNotes report={report} weeks={weeks} locale={locale} t={t} />
      </details>
    </section>
  )
}
