/**
 * The call log: one row per billed model call, queried and paged by the Host.
 *
 * This is the surface the folds cannot provide. A calendar answers when, a
 * project table answers where, and a model table answers which — but “why did
 * this figure move” is only ever answered by the settlement itself: its instant,
 * its route, its four token buckets and the money its own buckets cost. So the
 * page is a table first and a chart never, and every control above it narrows
 * the same query rather than drawing a second, derived figure.
 *
 * The query lives on the Host because the samples do. Filtering and paging here
 * in the browser would mean shipping a year of calls to draw fifty of them; the
 * route folds the cached samples, prices every match for its totals, and returns
 * one page. A filter change therefore costs a request, not a corpus read.
 *
 * @module dsh-local-usage/client/CallsPage
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageCallRow, UsageTokens } from '../types.ts'
import { cacheHitRate } from './cache-rate.ts'
import { projectName } from './paths.ts'
import {
  CALLS_PAGE_SIZES,
  CALLS_RANGES,
  CALLS_SORTS,
  useCallsQuery,
} from './useCallsQuery.ts'
import { formatMoment, formatSeconds, formatThroughput } from './format.ts'
import { css } from './classes.ts'

/** The first eight characters of a session's own id, without the shared prefix. */
function shortSessionId(id: string): string {
  const prefix = 'session-'
  return (id.startsWith(prefix) ? id.slice(prefix.length) : id).slice(0, 8)
}

/** The token total of one call, for the table's total column and its ordering. */
function totalTokens(tokens: UsageTokens): number {
  return tokens.uncachedInputTokens + tokens.outputTokens
    + tokens.cacheReadTokens + tokens.cacheWriteTokens
}

/** Props for the call-log page. */
export interface CallsPageProps {
  /** Active locale id, for figures and the timestamp's shape. */
  readonly locale: string
  readonly t: PropsLocale<'usage'>['t']
  readonly formatCost: (value: number) => string
  readonly formatTokens: (value: number) => string
  readonly formatInteger: (value: number) => string
  readonly formatPercent: (value: number) => string
  /** First instant of the window the page should open on, when a day sent the reader here. */
  readonly initialFrom?: number
  /** Last instant of that window. */
  readonly initialTo?: number
  /** Label for the way back, which differs between the calendar and a day page. */
  readonly backLabel?: string
  /** Leave the call log. */
  readonly onBack: () => void
}

/**
 * Render the call log.
 * @param props - the formatters, the optional starting window and the way back.
 * @returns the page.
 */
export function CallsPage({
  locale, t,
  formatCost, formatTokens, formatInteger, formatPercent,
  initialFrom, initialTo, backLabel, onBack,
}: CallsPageProps): ReactNode {
  const frame = useRef<HTMLElement>(null)
  // Replacing the panel's contents drops focus to the document body; a page
  // that opens should start at its own top, keyboard included.
  useEffect(() => { frame.current?.focus() }, [])
  // Filters, the page and the request they imply live in the query's own hook;
  // this component decides only how each of its states is drawn.
  const {
    rangeId, custom, model, search, sort, limit, offset, state, data, models,
    total, pageSize, page, pages, shownFrom, shownTo,
    chooseRange, moveCustom, chooseModel, writeSearch, chooseSort, chooseLimit, goToOffset, retry,
  } = useCallsQuery({
    ...initialFrom === undefined ? {} : { initialFrom },
    ...initialTo === undefined ? {} : { initialTo },
  })
  // A provider that never reports cache writes makes a column of zeroes read as
  // a bug in this panel. When the whole match reports none, the column is
  // dropped and the summary says writes went unreported instead.
  const showCacheWrite = data !== undefined && data.totals.cacheWriteTokens > 0
  const hitRate = data === undefined ? undefined : cacheHitRate(data.totals)

  return (
    <section ref={frame} className={css.breakdown} tabIndex={-1} aria-label={t('callsTitle')}>
      <header className={css.dayHeader}>
        <div className={css.headerText}>
          <div className={css.dayTitleRow}>
            <Button variant="outline" size="sm" onClick={onBack}>{backLabel ?? t('back')}</Button>
            <h2 className={css.dayTitle}>{t('callsTitle')}</h2>
          </div>
          <p className={css.subtitle}>{t('callsSubtitle')}</p>
        </div>
      </header>

      <div className={css.callFilters}>
        <div className={css.callField}>
          <span>{t('callsFilterRange')}</span>
          <div className={`${css.ranges} ${css.callRangeGroup}`} role="group" aria-label={t('callsFilterRange')}>
            {CALLS_RANGES.map(candidate => (
              <button
                key={candidate.id}
                type="button"
                className={`${css.range} ${css.callRange}`}
                aria-pressed={candidate.id === rangeId}
                onClick={() => { chooseRange(candidate.id) }}
              >
                {t(candidate.key)}
              </button>
            ))}
          </div>
        </div>

        {rangeId === 'custom' && custom !== undefined
          ? (
            <>
              <label className={css.callField}>
                <span>{t('rangeFrom')}</span>
                <input
                  type="date"
                  value={custom.from}
                  max={custom.to}
                  onChange={event => { moveCustom('from', event.target.value) }}
                />
              </label>
              <label className={css.callField}>
                <span>{t('rangeTo')}</span>
                <input
                  type="date"
                  value={custom.to}
                  min={custom.from}
                  onChange={event => { moveCustom('to', event.target.value) }}
                />
              </label>
            </>
          )
          : null}

        <label className={css.callField}>
          <span>{t('callsFilterModel')}</span>
          <select value={model} onChange={event => { chooseModel(event.target.value) }}>
            <option value="">{t('callsFilterAllModels')}</option>
            {model !== '' && !models.some(option => option.model === model)
              ? <option value={model}>{model}</option>
              : null}
            {models.map(option => (
              <option key={option.key} value={option.model}>
                {option.model} · {formatInteger(option.calls)}
              </option>
            ))}
          </select>
        </label>

        <label className={`${css.callField} ${css.callSearchField}`}>
          <span>{t('callsSearch')}</span>
          <input
            type="search"
            value={search}
            placeholder={t('callsSearchPlaceholder')}
            onChange={event => { writeSearch(event.target.value) }}
          />
        </label>

        <label className={css.callField}>
          <span>{t('callsSort')}</span>
          <select
            value={sort.id}
            onChange={(event) => {
              const next = CALLS_SORTS.find(candidate => candidate.id === event.target.value)
              if (next !== undefined) chooseSort(next.id)
            }}
          >
            {CALLS_SORTS.map(candidate => (
              <option key={candidate.id} value={candidate.id}>{t(candidate.key)}</option>
            ))}
          </select>
        </label>

        <label className={css.callField}>
          <span>{t('callsPageSize')}</span>
          <select
            value={String(limit)}
            onChange={(event) => {
              chooseLimit(Number(event.target.value))
            }}
          >
            {CALLS_PAGE_SIZES.map(size => <option key={size} value={String(size)}>{String(size)}</option>)}
          </select>
        </label>
      </div>

      {data === undefined ? null : (
        <>
          <div className={`${css.readings} ${css.callSummary}`}>
            <div className={css.reading}>
              <span className={css.readingLabel}>{t('callsSummaryCalls')}</span>
              <span className={css.readingValue}>{formatInteger(data.total)}</span>
              <span className={css.readingDetail}>{t('callsSummaryCallsDetail', {
                sessions: formatInteger(data.sessions),
                projects: formatInteger(data.projects),
              })}
              </span>
            </div>
            <div className={css.reading}>
              <span className={css.readingLabel}>{t('callsSummaryTokens')}</span>
              <span className={css.readingValue}>{formatTokens(
                totalTokens(data.totals),
              )}
              </span>
              <span className={css.readingDetail}>{t('callsSummaryTokensDetail', {
                input: formatTokens(data.totals.uncachedInputTokens),
                output: formatTokens(data.totals.outputTokens),
              })}
              </span>
            </div>
            <div className={css.reading}>
              <span className={css.readingLabel}>{t('callsSummaryCost')}</span>
              <span className={css.readingValue}>{formatCost(data.totals.cost)}</span>
              <span className={css.readingDetail}>{t('callsSummaryCostDetail')}</span>
            </div>
            <div className={css.reading}>
              <span className={css.readingLabel}>{t('callsSummaryHitRate')}</span>
              <span className={css.readingValue}>
                {hitRate === undefined ? '—' : formatPercent(hitRate)}
              </span>
              <span className={css.readingDetail}>
                {data.totals.cacheWriteTokens > 0
                  ? t('callsSummaryCacheDetail', {
                    read: formatTokens(data.totals.cacheReadTokens),
                    write: formatTokens(data.totals.cacheWriteTokens),
                  })
                  : t('callsSummaryCacheDetailRead', {
                    read: formatTokens(data.totals.cacheReadTokens),
                  })}
              </span>
            </div>
            <div className={css.reading}>
              <span className={css.readingLabel}>{t('callsSummarySessions')}</span>
              <span className={css.readingValue}>{formatInteger(data.sessions)}</span>
              <span className={css.readingDetail}>{t('callsSummarySessionsDetail')}</span>
            </div>
            <div className={css.reading}>
              <span className={css.readingLabel}>{t('callsSummaryProjects')}</span>
              <span className={css.readingValue}>{formatInteger(data.projects)}</span>
              <span className={css.readingDetail}>{t('callsSummaryProjectsDetail')}</span>
            </div>
          </div>
          <p className={css.callScopeNote}>{t('callsScanNote', {
            sessions: formatInteger(data.scannedSessions),
            source: data.cached ? t('dataCountsCached') : t('dataCountsFresh'),
          })}
          </p>
        </>
      )}

      {state.status === 'error'
        ? (
          <div className={css.failure}>
            <p role="alert">{t('callsError')}</p>
            <Button variant="outline" size="sm" onClick={retry}>
              {t('retry')}
            </Button>
          </div>
        )
        : null}

      {data === undefined && state.status === 'loading' ? <CallSkeleton /> : null}

      {data === undefined ? null : (data.rows.length === 0
        ? <p className={css.empty}>{t('callsEmpty')}</p>
        : (
          <div
            className={css.callTableWrap}
            data-stale={state.status === 'loading' ? 'true' : undefined}
            aria-busy={state.status === 'loading'}
          >
            <table className={css.callTable}>
              <caption className={css.visuallyHidden}>{t('callsTitle')}</caption>
              <colgroup>
                <col className={css.callColTime} />
                <col className={css.callColSession} />
                <col className={css.callColModel} />
                <col className={css.callColNumber} />
                <col className={css.callColNumber} />
                {showCacheWrite ? <col className={css.callColNumber} /> : null}
                <col className={css.callColNumber} />
                <col className={css.callColNumber} />
                <col className={css.callColTiming} />
                <col className={css.callColTiming} />
                <col className={css.callColTiming} />
                <col className={css.callColNumber} />
                <col className={css.callColCost} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" aria-sort={sort.sort === 'time'
                    ? sort.dir === 'asc' ? 'ascending' : 'descending'
                    : 'none'}
                  >
                    {t('callsColumnTime')}
                  </th>
                  <th scope="col">{t('callsColumnSession')}</th>
                  <th scope="col">{t('callsColumnModel')}</th>
                  <th scope="col" className={css.numeric}>{t('inputTokens')}</th>
                  <th scope="col" className={css.numeric}>{t('cacheRead')}</th>
                  {showCacheWrite
                    ? <th scope="col" className={css.numeric}>{t('cacheWrite')}</th>
                    : null}
                  <th scope="col" className={css.numeric}>{t('outputTokens')}</th>
                  <th scope="col" className={css.numeric}>{t('callsColumnTotal')}</th>
                  <th scope="col" className={css.numeric}>{t('callsColumnFirstToken')}</th>
                  <th scope="col" className={css.numeric}>{t('callsColumnDuration')}</th>
                  <th scope="col" className={css.numeric}>{t('callsColumnTps')}</th>
                  <th scope="col" className={css.numeric}>{t('callsColumnHitRate')}</th>
                  <th scope="col" className={css.numeric}>{t('cost')}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map(row => <CallRowView
                  key={row.id}
                  row={row}
                  t={t}
                  locale={locale}
                  formatCost={formatCost}
                  formatTokens={formatTokens}
                  formatInteger={formatInteger}
                  formatPercent={formatPercent}
                  showCacheWrite={showCacheWrite}
                />)}
              </tbody>
            </table>
          </div>
        ))}

      {data === undefined ? null : (
        <footer className={css.callPager}>
          <span className={css.callPagerNote} aria-live="polite">
            {total === 0
              ? t('callsPagerEmpty')
              : t('callsPagerShowing', {
                from: formatInteger(shownFrom),
                to: formatInteger(shownTo),
                total: formatInteger(total),
              })}
            {state.status === 'loading' ? ` · ${t('callsQuerying')}` : null}
          </span>
          <div className={css.callPagerControls}>
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0 || state.status === 'loading'}
              onClick={() => { goToOffset(Math.max(0, offset - pageSize)) }}
            >
              {t('callsPrev')}
            </Button>
            <span className={css.callPagerPage}>
              {t('callsPagerPage', {
                page: formatInteger(page),
                pages: formatInteger(pages),
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + pageSize >= total || state.status === 'loading'}
              onClick={() => { goToOffset(offset + pageSize) }}
            >
              {t('callsNext')}
            </Button>
          </div>
        </footer>
      )}
    </section>
  )
}

/** One row of the log, with every figure stated exactly in its hover title. */
function CallRowView({
  row, t, locale, showCacheWrite,
  formatCost, formatTokens, formatInteger, formatPercent,
}: {
  readonly row: UsageCallRow
  readonly t: PropsLocale<'usage'>['t']
  readonly locale: string
  readonly showCacheWrite: boolean
  readonly formatCost: (value: number) => string
  readonly formatTokens: (value: number) => string
  readonly formatInteger: (value: number) => string
  readonly formatPercent: (value: number) => string
}): ReactNode {
  const hit = cacheHitRate(row.tokens)
  const moment = formatMoment(row.time, locale)
  const exact = (value: number): string => t('callsExact', { value: formatInteger(value) })
  return (
    <tr>
      <td className={css.callMoment}>{moment}</td>
      <th scope="row" className={css.callSessionCell}>
        <span className={css.callSessionName} title={row.title ?? row.sessionId}>
          {row.title ?? t('sessionUntitled')}
        </span>
        <span
          className={css.callSubjectMeta}
          title={`${row.cwd ?? t('projectUnknown')} · ${row.sessionId}${row.turn === undefined || row.step === undefined ? '' : ` · ${t('callsTurnStep', { turn: formatInteger(row.turn), step: formatInteger(row.step) })}`}`}
        >
          {row.cwd === undefined ? t('projectUnknown') : projectName(row.cwd) ?? row.cwd}
          {' · #'}{shortSessionId(row.sessionId)}
          {row.turn === undefined || row.step === undefined
            ? ''
            : ` · ${t('callsTurnStep', {
              turn: formatInteger(row.turn),
              step: formatInteger(row.step),
            })}`}
        </span>
      </th>
      <td
        className={css.callModelCell}
        title={row.priced ? row.route : `${row.route} · ${t('pricingSourceFallback')}`}
      >
        <span
          className={css.callModelName}
          title={`${row.model}\n${row.route}${row.priced ? '' : ` · ${t('pricingSourceFallback')}`}`}
        >
          {row.model}
        </span>
      </td>
      <td className={css.numeric} title={exact(row.tokens.uncachedInputTokens)}>
        {formatTokens(row.tokens.uncachedInputTokens)}
      </td>
      <td className={css.numeric} title={exact(row.tokens.cacheReadTokens)}>
        {formatTokens(row.tokens.cacheReadTokens)}
      </td>
      {showCacheWrite
        ? (
          <td className={css.numeric} title={exact(row.tokens.cacheWriteTokens)}>
            {formatTokens(row.tokens.cacheWriteTokens)}
          </td>
        )
        : null}
      <td className={css.numeric} title={exact(row.tokens.outputTokens)}>
        {formatTokens(row.tokens.outputTokens)}
      </td>
      <td className={css.numeric} title={exact(totalTokens(row.tokens))}>
        {formatTokens(totalTokens(row.tokens))}
      </td>
      <td className={css.numeric} title={row.firstTokenMs === undefined
        ? undefined
        : formatSeconds(row.firstTokenMs, locale)}
      >
        {row.firstTokenMs === undefined ? '—' : formatSeconds(row.firstTokenMs, locale)}
      </td>
      <td className={css.numeric} title={row.durationMs === undefined
        ? undefined
        : formatSeconds(row.durationMs, locale)}
      >
        {row.durationMs === undefined ? '—' : formatSeconds(row.durationMs, locale)}
      </td>
      <td className={css.numeric} title={row.outputTps === undefined
        ? undefined
        : formatThroughput(row.outputTps, locale)}
      >
        {row.outputTps === undefined ? '—' : formatThroughput(row.outputTps, locale)}
      </td>
      <td className={css.numeric} title={hit === undefined ? undefined : formatPercent(hit)}>
        {hit === undefined ? '—' : formatPercent(hit)}
      </td>
      <td className={css.callCost} title={t('callsExact', { value: formatCost(row.cost) })}>
        {formatCost(row.cost)}
      </td>
    </tr>
  )
}

/** The table's own wait: the columns it will hold, at the height it will hold them. */
function CallSkeleton(): ReactNode {
  return (
    <div className={css.callTableWrap} aria-hidden="true">
      <table className={css.callTable}>
        <colgroup>
          <col className={css.callColTime} />
          <col className={css.callColSession} />
          <col className={css.callColModel} />
          <col className={css.callColNumber} />
          <col className={css.callColNumber} />
          <col className={css.callColNumber} />
          <col className={css.callColNumber} />
          <col className={css.callColNumber} />
          <col className={css.callColTiming} />
          <col className={css.callColTiming} />
          <col className={css.callColTiming} />
          <col className={css.callColNumber} />
          <col className={css.callColCost} />
        </colgroup>
        <tbody>
          {Array.from({ length: 8 }, (_, row) => (
            <tr key={row} className={css.callSkeletonRow}>
              {Array.from({ length: 13 }, (_, column) => (
                <td key={column}><span className={css.skelLine} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
