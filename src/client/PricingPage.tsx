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
import { RateEditor, type RateRow } from './RateEditor.tsx'
import { groupRouteUsage } from './route-models.ts'
import { modelKey } from '../model-name.ts'
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
  // Every model the window recorded, with the card that prices it: a configured
  // one, an edited one, or the fallback standing in until the reader writes their
  // own. One list, because the question is "what does this model cost" — not
  // "which of the two tables do I read".
  const configured = report.prices
  // Every route's own cost, so a model's share is a share of the money rather
  // than of the tokens: at these prices those are not the same quantity.
  const costByRoute = new Map(report.models.map(row => [row.route, row.cost]))
  const grouped = groupRouteUsage(report.routeRates, route => costByRoute.get(route) ?? 0)
  const totalCost = grouped.reduce((sum, group) => sum + group.cost, 0)
  const rows: RateRow[] = grouped.map(group => {
    const card = configured.find(candidate => modelKey(candidate.match) === group.key)
    return {
      card: card ?? { ...report.fallbackPrice, match: group.model },
      tokens: group.tokens,
      cost: group.cost,
      routes: group.routes.length,
      inherited: card === undefined,
      share: totalCost <= 0 ? 0 : group.cost / totalCost,
    }
  })

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
