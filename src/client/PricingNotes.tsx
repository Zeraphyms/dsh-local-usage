/**
 * How the money figure is computed, stated where the figure is read.
 *
 * The harness records tokens and never currency, so every cost on this panel is
 * this plugin's own arithmetic over a configured rate card. That makes it an
 * estimate by construction, and the ways it can differ from an invoice —
 * prepaid credit, packages, volume discounts, aggregator markups — are exactly
 * the things a reader would otherwise assume were included. Stating the formula,
 * the rates actually in effect, and the peak schedule is what lets the number be
 * trusted as far as it goes and no further.
 *
 * The table is also the editor: the four prices of any route the window recorded
 * can be typed over, and an override is what makes the figure stop being a
 * guess for that route.
 *
 * @module dsh-local-usage/client/PricingNotes
 */

import type { ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsagePricingUpdate, UsageInsightsReport, UsagePriceRow } from '../types.ts'
import { formatRate } from './format.ts'
import { RateEditor } from './RateEditor.tsx'
import { css } from './classes.ts'

/** One rate card row in the read-only rule table. */
function PriceRow({ row, label, currency, locale }: {
  readonly row: UsagePriceRow
  readonly label: string
  readonly currency: string
  readonly locale: string
}): ReactNode {
  return (
    <tr>
      <td><code className={css.priceMatch}>{label}</code></td>
      <td className={css.numeric}>{formatRate(row.input, locale)}</td>
      <td className={css.numeric}>{formatRate(row.cacheRead, locale)}</td>
      <td className={css.numeric}>{formatRate(row.cacheWrite, locale)}</td>
      <td className={css.numeric}>{formatRate(row.output, locale)}</td>
      <td className={css.priceCurrency}>{currency}</td>
    </tr>
  )
}

/** Props for the pricing popover's body. */
export interface PricingNotesProps {
  readonly report: UsageInsightsReport
  /** Active locale id; rate figures are written in the reader's language. */
  readonly locale: string
  readonly t: PropsLocale<'usage'>['t']
  /** Compact token formatter, passed through to the editor's volume column. */
  readonly formatTokens: (value: number) => string
  /** Persist one rate override. */
  readonly onSaveRates: (update: UsagePricingUpdate) => Promise<void>
}

/**
 * Render the pricing body.
 * @param props - the report whose rates are in effect, the dictionary, and the write action.
 * @returns the pricing block.
 */
export function PricingNotes({ report, locale, t, formatTokens, onSaveRates }: PricingNotesProps): ReactNode {
  // Resolved only when it will be rendered: an empty window list drops the
  // sentence outright rather than filling it with a placeholder.
  const schedule = report.peakWindows.length === 0
    ? undefined
    : t('pricingPeakSchedule', {
      windows: report.peakWindows.join(t('listSeparator')),
      weekdayScope: report.peakWeekdaysOnly ? t('pricingWeekdaysOnly') : t('pricingEveryDay'),
      multiplier: String(report.peakMultiplier),
    })
  return (
    <div className={css.disclosureBody}>
      <p>{t('pricingFormula')}</p>
      {schedule === undefined ? null : <p>{schedule}</p>}
      <p>{t('pricingSource')}</p>
      <p className={css.pricingCaveat}>{t('pricingNotBill')}</p>
      {report.prices.length === 0 ? null : (
        <>
          <p className={css.pricingRatesLabel}>{t('pricingRates', { currency: report.currency })}</p>
          <table className={css.priceTable}>
            <thead>
              <tr>
                <th scope="col">{t('pricingColumnMatch')}</th>
                <th scope="col" className={css.numeric}>{t('pricingColumnInput')}</th>
                <th scope="col" className={css.numeric}>{t('pricingColumnCacheRead')}</th>
                <th scope="col" className={css.numeric}>{t('pricingColumnCacheWrite')}</th>
                <th scope="col" className={css.numeric}>{t('pricingColumnOutput')}</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {report.prices.map(row => (
                <PriceRow
                  key={row.match}
                  row={row}
                  label={row.match}
                  currency={report.currency}
                  locale={locale}
                />
              ))}
              <PriceRow
                row={report.fallbackPrice}
                label={t('pricingFallback')}
                currency={report.currency}
                locale={locale}
              />
            </tbody>
          </table>
          <p className={css.pricingHint}>{t('pricingUnknownRoute')}</p>
        </>
      )}
      <RateEditor
        routes={report.routeRates}
        currency={report.currency}
        t={t}
        formatTokens={formatTokens}
        onSave={onSaveRates}
      />
    </div>
  )
}
