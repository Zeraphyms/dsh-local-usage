/**
 * The range's detail view: what the figures on the front page are made of.
 *
 * The panel is the answer to "what has this cost me"; this page is the answer to
 * the questions that raises — which model, at what hour, against what it cost
 * last week — and it exists as a second page precisely because the front page is
 * already full. Nothing here is a second source of truth: every figure is folded
 * by the Host from the same samples the front page prices, and the only
 * arithmetic this page owns is the reading of those folds (see `analysis.ts`).
 *
 * @module dsh-local-usage/client/BreakdownPage
 */

import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageInsightsReport } from '../types.ts'
import { changeOf, daysToCsv, largestOf, topSessions, weekdayProfile } from './analysis.ts'
import { cacheHitRate } from './cache-rate.ts'
import { dayKey } from './heatmap-grid.ts'
import { tokensOf } from './tokens.ts'
import { projectName } from './paths.ts'
import { css } from './classes.ts'

/** Compact weekday names, Sunday first, matching the calendar's own gutter. */
const WEEKDAY_SHORT_KEYS = [
  'wdShort.0', 'wdShort.1', 'wdShort.2', 'wdShort.3', 'wdShort.4', 'wdShort.5', 'wdShort.6',
] as const

/** Sessions the page lists before the list stops being read. */
const SESSION_LIMIT = 8
/** Routes the page lists; a corpus with more has a long tail nobody reads. */
const ROUTE_LIMIT = 8
/**
 * Days the bar chart draws, newest kept.
 *
 * One row per day stops being readable long before a year of them: a
 * twelve-month window would draw 365 rows and turn this page into a wall of
 * hairlines. The calendar above already answers a year at a year's scale, so the
 * chart states the recent stretch and says how much of the window it is showing.
 */
const DAY_BAR_LIMIT = 31

/** Props for the detail view. */
export interface BreakdownPageProps {
  /** The report for the range the reader selected; absent until its fold lands. */
  readonly report: UsageInsightsReport | undefined
  /** The range's own label, so the page names the window it describes. */
  readonly rangeLabel: string
  /** Failed to fold: the page states it rather than rendering an empty one. */
  readonly failed: boolean
  readonly t: PropsLocale<'usage'>['t']
  readonly formatCost: (value: number) => string
  readonly formatTokens: (value: number) => string
  readonly formatInteger: (value: number) => string
  readonly formatPercent: (value: number) => string
  /** Localized date for a day key, used to state the compared window's bounds. */
  readonly formatDay: (day: string) => string
  /** Leave the page and return to the calendar. */
  readonly onBack: () => void
  /** Retry a fold that failed. */
  readonly onRetry: () => void
}

/**
 * One labelled figure, in the page's own block language.
 *
 * The front page's tiles are a fixed grid that must not move; these are a
 * wrapping row of readings, where a figure that needs two lines may have them.
 */
function Reading({ label, value, detail }: {
  readonly label: string
  readonly value: string
  readonly detail?: string
}): ReactNode {
  return (
    <div className={css.reading}>
      <span className={css.readingLabel}>{label}</span>
      <span className={css.readingValue}>{value}</span>
      {detail === undefined ? null : <span className={css.readingDetail}>{detail}</span>}
    </div>
  )
}

/** One horizontal bar chart drawn from rows, CSS only. */
function Bars<T>({ rows, value, label, caption }: {
  readonly rows: readonly T[]
  readonly value: (row: T) => number
  readonly label: (row: T) => string
  readonly caption: (row: T) => string
}): ReactNode {
  const largest = largestOf(rows, value)
  return (
    <ol className={css.bars}>
      {rows.map((row, index) => {
        const amount = value(row)
        const share = largest <= 0 ? 0 : amount / largest
        return (
          <li key={index} className={css.barRow} title={caption(row)}>
            <span className={css.barLabel}>{label(row)}</span>
            <span className={css.barTrack}>
              <span className={css.barFill} style={{ inlineSize: `${(share * 100).toFixed(1)}%` }} />
            </span>
            <span className={css.barValue}>{caption(row)}</span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Render the range's detail view.
 * @param props - the range's report, its label, the formatters, and the controls.
 * @returns the page.
 */
export function BreakdownPage(props: BreakdownPageProps): ReactNode {
  const { report, rangeLabel, failed, t, formatCost, onBack, onRetry } = props
  return (
    <section className={css.breakdown} aria-label={t('breakdownTitle')}>
      <header className={css.dayHeader}>
        <div className={css.headerText}>
          <div className={css.dayTitleRow}>
            <Button variant="outline" size="sm" onClick={onBack}>{t('back')}</Button>
            <h2 className={css.dayTitle}>{t('breakdownTitle')}</h2>
            <span className={css.dayWeekday}>{rangeLabel}</span>
          </div>
          <p className={css.subtitle}>{t('breakdownSubtitle')}</p>
        </div>
        {report === undefined ? null : (
          <div className={css.hero}>
            <span className={css.heroLabel}>{t('totalCost')}</span>
            <span className={css.heroValue}>{formatCost(report.totals.cost)}</span>
          </div>
        )}
      </header>

      {report === undefined
        ? (failed
          ? (
            <div className={css.failure}>
              <p role="alert">{t('error')}</p>
              <Button variant="outline" size="sm" onClick={onRetry}>{t('retry')}</Button>
            </div>
          )
          : <p className={css.status} role="status">{t('loading')}</p>)
        : <BreakdownBody {...props} report={report} />}
    </section>
  )
}

/**
 * What the page states once it has a report.
 *
 * Apart from the frame because the frame has to exist before the fold does: a
 * reader who opened this page must be able to leave it again.
 */
function BreakdownBody({
  report, rangeLabel, t,
  formatCost, formatTokens, formatInteger, formatPercent, formatDay,
}: BreakdownPageProps & { readonly report: UsageInsightsReport }): ReactNode {
  const { totals, peak, cache, hourly, previous } = report
  const activeDays = report.days.length
  const hitRate = cacheHitRate(totals)
  // The recent stretch, oldest first, plus the count the chart is not showing.
  const dayRows = report.days.slice(-DAY_BAR_LIMIT)
  const hiddenDays = report.days.length - dayRows.length

  return (
    <>
            {/* Against the window before it. Absent unless the reader asked for
                the comparison, so the block states its own absence rather than
                comparing against nothing. */}
            <section className={css.block}>
              <h3 className={css.blockTitle}>{t('breakdownCompare')}</h3>
              {previous === undefined
                ? <p className={css.empty}>{t('breakdownCompareUnavailable')}</p>
                : (
                  <div className={css.readings}>
                    <Reading
                      label={t('breakdownPreviousCost')}
                      value={formatCost(previous.totals.cost)}
                      detail={t('breakdownPreviousRange', {
                        from: formatDay(dayKey(previous.from)),
                        to: formatDay(dayKey(previous.to)),
                      })}
                    />
                    <Reading
                      label={t('breakdownChange')}
                      value={describeChange(changeOf(totals.cost, previous.totals.cost), formatCost, formatPercent)}
                      detail={t('breakdownPreviousCalls', { count: formatInteger(previous.totals.calls) })}
                    />
                    <Reading
                      label={t('breakdownPreviousTokens')}
                      value={formatTokens(previous.totals.uncachedInputTokens + previous.totals.outputTokens
                        + previous.totals.cacheReadTokens + previous.totals.cacheWriteTokens)}
                    />
                  </div>
                )}
            </section>

            <section className={css.block}>
              <h3 className={css.blockTitle}>{t('breakdownComposition')}</h3>
              <div className={css.readings}>
                {/* Peak is stated as money: the schedule is configuration, and
                    what a reader can decide about is what it cost. */}
                <Reading
                  label={t('breakdownPeakCost')}
                  value={formatCost(peak.peakCost)}
                  detail={peak.peakCalls === 0
                    ? t('breakdownNoPeak')
                    : t('breakdownPeakShare', {
                      share: formatPercent(peak.peakCost + peak.offPeakCost === 0
                        ? 0
                        : peak.peakCost / (peak.peakCost + peak.offPeakCost)),
                      calls: formatInteger(peak.peakCalls),
                    })}
                />
                <Reading
                  label={t('breakdownPremium')}
                  value={formatCost(peak.premium)}
                  detail={t('breakdownPremiumHint')}
                />
                <Reading
                  label={t('breakdownCacheSaved')}
                  value={formatCost(cache.saved)}
                  detail={cache.inputCost === 0
                    ? t('breakdownNoCache')
                    : t('breakdownCacheBasis', { paid: formatCost(cache.readCost) })}
                />
                <Reading
                  label={t('breakdownAverageCall')}
                  value={totals.calls === 0 ? '—' : formatCost(totals.cost / totals.calls)}
                />
                <Reading
                  label={t('breakdownAverageSession')}
                  value={totals.sessions === 0 ? '—' : formatCost(totals.cost / totals.sessions)}
                />
                <Reading
                  label={t('breakdownAverageDay')}
                  value={activeDays === 0 ? '—' : formatCost(totals.cost / activeDays)}
                  detail={t('breakdownActiveDays', { count: formatInteger(activeDays) })}
                />
                <Reading
                  label={t('cacheHitRate')}
                  value={hitRate === undefined ? '—' : formatPercent(hitRate)}
                  detail={t('cacheHitRateBasis')}
                />
              </div>
            </section>

            {/* Where the money went, by the route that was billed for it. */}
            <section className={css.block}>
              <h3 className={css.blockTitle}>{t('breakdownByRoute')}</h3>
              {report.models.length === 0
                ? <p className={css.empty}>{t('noUsage')}</p>
                : (
                  <table className={css.table}>
                    <thead>
                      <tr>
                        <th scope="col">{t('routeColumn')}</th>
                        <th scope="col" className={css.numeric}>{t('totalTokens')}</th>
                        <th scope="col" className={css.numeric}>{t('cost')}</th>
                        <th scope="col" className={css.numeric}>{t('calls')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.models.slice(0, ROUTE_LIMIT).map(row => (
                        <tr key={row.route}>
                          <th scope="row" className={css.cellName}>
                            <code className={css.priceMatch} title={row.route}>{row.route}</code>
                            {row.priced ? null : <span className={css.unpricedBadge}>{t('pricingFallback')}</span>}
                          </th>
                          <td className={css.numeric}>{formatInteger(tokensOf(row))}</td>
                          <td className={css.numeric}>{formatCost(row.cost)}</td>
                          <td className={css.numeric}>{formatInteger(row.calls)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              {report.models.length > ROUTE_LIMIT
                ? <p className={css.blockHint}>{t('breakdownRouteNote', {
                  shown: formatInteger(ROUTE_LIMIT),
                  total: formatInteger(report.models.length),
                })}
                </p>
                : null}
            </section>

            {/* When it went. The calendar answers this at a year's scale; these
                two answer it at the range's, and in the clock the peak schedule
                is stated in. */}
            <section className={css.block}>
              <h3 className={css.blockTitle}>{t('breakdownWhen')}</h3>
              {report.days.length === 0
                ? <p className={css.empty}>{t('noUsage')}</p>
                : (
                  <>
                    <p className={css.blockHint}>{hiddenDays === 0
                      ? t('breakdownByDay')
                      : t('breakdownDayNote', {
                        shown: formatInteger(dayRows.length),
                        total: formatInteger(activeDays),
                      })}
                    </p>
                    <Bars
                      rows={dayRows}
                      value={row => row.cost}
                      label={row => row.day.slice(5)}
                      caption={row => formatCost(row.cost)}
                    />
                  </>
                )}
              {hourly.length === 0 || totals.calls === 0
                ? null
                : (
                  <>
                    <p className={css.blockHint}>{t('breakdownByHour')}</p>
                    <Bars
                      rows={hourly}
                      value={row => row.cost}
                      label={row => `${String(row.hour).padStart(2, '0')}`}
                      caption={row => row.calls === 0 ? '' : formatCost(row.cost)}
                    />
                  </>
                )}
              {report.days.length === 0 ? null : (
                <>
                  <p className={css.blockHint}>{t('breakdownByWeekday')}</p>
                  <Bars
                    rows={weekdayProfile(report.days)}
                    value={row => row.cost}
                    label={row => t(WEEKDAY_SHORT_KEYS[row.weekday] ?? 'wdShort.0')}
                    caption={row => row.calls === 0 ? '' : formatCost(row.cost)}
                  />
                </>
              )}
            </section>

            {/* Which conversation. The day page answers this one directory at a
                time; the range's own list answers it for the range. */}
            <section className={css.block}>
              <h3 className={css.blockTitle}>{t('breakdownSessions')}</h3>
              {report.sessions.length === 0
                ? <p className={css.empty}>{t('noUsage')}</p>
                : (
                  <ol className={css.sessionList}>
                    {topSessions(report.sessions, SESSION_LIMIT).map(row => (
                      <li key={row.sessionId} className={css.sessionRow}>
                        <span className={css.sessionName}>
                          {row.title ?? t('sessionUntitled')}
                        </span>
                        <code className={css.rankPath} title={row.cwd ?? undefined}>
                          {row.cwd === undefined ? '' : projectName(row.cwd) ?? row.cwd}
                        </code>
                        <span className={css.sessionFigures}>
                          <span className={css.numeric}>{formatCost(row.cost)}</span>
                          <span className={css.numeric}>{formatTokens(tokensOf(row))}</span>
                          <span className={css.numeric}>{formatInteger(row.calls)}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              {report.sessions.length > SESSION_LIMIT
                ? <p className={css.blockHint}>{t('breakdownSessionNote', {
                  shown: formatInteger(SESSION_LIMIT),
                  total: formatInteger(report.sessions.length),
                })}
                </p>
                : null}
            </section>

            <section className={css.block}>
              <h3 className={css.blockTitle}>{t('breakdownExport')}</h3>
              <p className={css.blockHint}>{t('breakdownExportHint')}</p>
              <Button
                variant="outline"
                size="sm"
                disabled={report.days.length === 0}
                onClick={() => { downloadCsv(report, rangeLabel) }}
              >
                {t('breakdownExportAction')}
              </Button>
            </section>
    </>
  )
}

/** One change as a signed figure, or a dash when there is no rate to state. */
function describeChange(
  change: ReturnType<typeof changeOf>,
  formatCost: (value: number) => string,
  formatPercent: (value: number) => string,
): string {
  if (change.ratio === undefined) {
    return change.delta === 0 ? '—' : `${change.delta > 0 ? '+' : '−'}${formatCost(Math.abs(change.delta))}`
  }
  const sign = change.delta > 0 ? '+' : change.delta < 0 ? '−' : ''
  return `${sign}${formatPercent(Math.abs(change.ratio))}`
}

/**
 * Hand the window's days to the reader as a CSV file.
 *
 * A download rather than a clipboard write: the point of the table is to be
 * opened somewhere else, and a click that silently fills a clipboard is a click
 * with nothing to show for it.
 *
 * @param report - the report being exported.
 * @param rangeLabel - the range's label, used in the filename.
 */
function downloadCsv(report: UsageInsightsReport, rangeLabel: string): void {
  const blob = new Blob([daysToCsv(report.days)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `usage-${rangeLabel}-${report.days[0]?.day ?? 'export'}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
