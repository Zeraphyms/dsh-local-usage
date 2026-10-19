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
  report, weeks, locale, t, onSaveRates, onBack,
}: PricingPageProps): ReactNode {
  // Resolved only when it will be rendered: an empty window list drops the
  // sentence outright rather than filling it with a placeholder.
  const schedule = report.peakWindows.length === 0
    ? undefined
    : t('pricingPeakSchedule', {
      windows: report.peakWindows.join(t('listSeparator')),
      weekdayScope: report.peakWeekdaysOnly ? t('pricingWeekdaysOnly') : t('pricingEveryDay'),
    })
  // Every model the window recorded, with the card that prices it: a configured
  // one, an edited one, or the fallback standing in until the reader writes their
  // own. One list, because the question is "what does this model cost" — not
  // "which of the two tables do I read".
  const configured = report.prices
  const rows: RateRow[] = groupRouteUsage(report.routeRates).map(group => {
    const card = configured.find(candidate => modelKey(candidate.match) === group.key)
    return {
      card: card ?? { ...report.fallbackPrice, match: group.model },
      tokens: group.tokens,
      routes: group.routes.length,
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

      {/* What the figure is, before what can be changed about it. */}
      <section className={css.pricingSection}>
        <p>{t('pricingFormula')}</p>
        {schedule === undefined ? null : <p>{schedule}</p>}
        <p>{t('pricingSource')}</p>
        <p className={css.pricingCaveat}>{t('pricingNotBill')}</p>
      </section>

      {report.unpricedRoutes.length === 0 ? null : (
        <p className={css.warning} role="note">
          {t('unpriced', { list: report.unpricedRoutes.join(', ') })}
        </p>
      )}

      <RateEditor
        rows={rows}
        currency={report.currency}
        t={t}
        onSave={onSaveRates}
      />

      <section className={css.pricingSection}>
        <h4 className={css.editorTitle}>{t('dataTitle')}</h4>
        <DataSourceNotes report={report} weeks={weeks} locale={locale} t={t} />
      </section>
    </section>
  )
}
