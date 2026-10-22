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

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageCallRow, UsageCallsReport, UsageCallSort, UsageTokens } from '../types.ts'
import { cacheHitRate } from './cache-rate.ts'
import { addDays, dayKey, dayTime, midnight, nextDayStart } from './heatmap-grid.ts'
import { displayModel, modelKey } from '../model-name.ts'
import { projectName } from './paths.ts'
import { CALLS_PATH } from './routes.ts'
import { formatMoment, formatSeconds, formatThroughput } from './format.ts'
import { normalizeCallsReport } from './wire-calls.ts'
import type { UsageInsightsLocaleKey } from './locales.ts'
import { css } from './classes.ts'

/** Ranges the page offers, in selection order. */
type RangeId = 'today' | 'week' | 'month' | 'all' | 'custom'

const RANGES: readonly { readonly id: RangeId; readonly key: UsageInsightsLocaleKey }[] = [
  { id: 'today', key: 'rangeDay' },
  { id: 'week', key: 'range7' },
  { id: 'month', key: 'rangeMonth' },
  { id: 'all', key: 'callsRangeAll' },
  { id: 'custom', key: 'rangeCustom' },
]

/** Ordering choices, the id carrying both the column and its direction. */
type SortId = 'time-desc' | 'time-asc' | 'cost-desc' | 'tokens-desc' | 'output-desc'

interface SortChoice {
  readonly id: SortId
  readonly key: UsageInsightsLocaleKey
  readonly sort: UsageCallSort
  readonly dir: 'asc' | 'desc'
}

const SORTS: readonly SortChoice[] = [
  { id: 'time-desc', key: 'callsSortTimeDesc', sort: 'time', dir: 'desc' },
  { id: 'time-asc', key: 'callsSortTimeAsc', sort: 'time', dir: 'asc' },
  { id: 'cost-desc', key: 'callsSortCostDesc', sort: 'cost', dir: 'desc' },
  { id: 'tokens-desc', key: 'callsSortTokensDesc', sort: 'tokens', dir: 'desc' },
  { id: 'output-desc', key: 'callsSortOutputDesc', sort: 'output', dir: 'desc' },
]

/** The ordering used until the reader says otherwise. */
const DEFAULT_SORT: SortChoice = SORTS[0] ?? {
  id: 'time-desc',
  key: 'callsSortTimeDesc',
  sort: 'time',
  dir: 'desc',
}

/** Page sizes offered, in the order a reader is likely to want them. */
const PAGE_SIZES: readonly number[] = [50, 100, 200]

/** A hand-picked range, as the two day keys the date fields hold. */
interface CustomRange {
  readonly from: string
  readonly to: string
}

/** One query fetch's state; `data` survives a later page so the table never blinks. */
interface CallsState {
  readonly status: 'loading' | 'ready' | 'error'
  readonly data?: UsageCallsReport
}

/** Inclusive bounds of one selected range, in Unix epoch milliseconds. */
function boundsOf(id: RangeId, now: number, custom: CustomRange | undefined): {
  readonly from?: number
  readonly to?: number
} {
  const today = midnight(now)
  const end = nextDayStart(today) - 1
  if (id === 'all') return {}
  if (id === 'today') return { from: today, to: end }
  if (id === 'week') return { from: addDays(today, -6), to: end }
  if (id === 'month') {
    const date = new Date(now)
    return { from: new Date(date.getFullYear(), date.getMonth(), 1).getTime(), to: end }
  }
  if (id === 'custom' && custom !== undefined) {
    const from = dayTime(custom.from)
    const to = dayTime(custom.to)
    if (from !== undefined && to !== undefined && to >= from) return { from, to: nextDayStart(to) - 1 }
  }
  return { from: today, to: end }
}

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
  // The panel fixes its frame at mount; the call log does the same, so a page
  // left open across midnight keeps answering the window it was opened on.
  const now = useMemo(() => Date.now(), [])
  const frame = useRef<HTMLElement>(null)
  // Replacing the panel's contents drops focus to the document body; a page
  // that opens should start at its own top, keyboard included.
  useEffect(() => { frame.current?.focus() }, [])
  const [rangeId, setRangeId] = useState<RangeId>(initialFrom === undefined ? 'week' : 'custom')
  const [custom, setCustom] = useState<CustomRange | undefined>(
    initialFrom === undefined
      ? undefined
      : { from: dayKey(initialFrom), to: dayKey(initialTo ?? initialFrom) },
  )
  const [model, setModel] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [sortId, setSortId] = useState<SortId>(DEFAULT_SORT.id)
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [reload, setReload] = useState(0)
  const [state, setState] = useState<CallsState>({ status: 'loading' })

  // Typing is a query on every keystroke only if the reader asked for one; a
  // short settle keeps a title being spelled from firing a request per letter.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(search.trim())
      setOffset(0)
    }, 220)
    return () => { window.clearTimeout(timer) }
  }, [search])

  const bounds = boundsOf(rangeId, now, custom)
  const sort = SORTS.find(candidate => candidate.id === sortId) ?? DEFAULT_SORT
  const queryKey = [
    String(bounds.from ?? ''),
    String(bounds.to ?? ''),
    model,
    appliedSearch,
    sort.sort,
    sort.dir,
    String(limit),
  ].join('|')

  useEffect(() => {
    const controller = new AbortController()
    let live = true
    setState(previous => previous.data === undefined
      ? { status: 'loading' }
      : { status: 'loading', data: previous.data })
    const url = new URL(CALLS_PATH, window.location.origin)
    if (bounds.from !== undefined) url.searchParams.set('from', String(bounds.from))
    if (bounds.to !== undefined) url.searchParams.set('to', String(bounds.to))
    if (model.length > 0) url.searchParams.set('model', model)
    if (appliedSearch.length > 0) url.searchParams.set('q', appliedSearch)
    url.searchParams.set('sort', sort.sort)
    url.searchParams.set('dir', sort.dir)
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('limit', String(limit))
    void fetch(url, { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`call log answered ${String(response.status)}`)
        return await response.json() as Partial<UsageCallsReport>
      })
      .then((value) => {
        if (live) setState({ status: 'ready', data: normalizeCallsReport(value) })
      })
      .catch(() => {
        if (!live) return
        setState(previous => previous.data === undefined
          ? { status: 'error' }
          : { status: 'error', data: previous.data })
      })
    return () => { live = false; controller.abort() }
    // `queryKey` carries every filter; `offset` and `reload` are the page and the
    // retry, and changing either is a new request over the same filters.
  }, [queryKey, offset, reload])

  /** Move one end of the hand-picked range, keeping the other end on its side. */
  function moveCustom(which: 'from' | 'to', value: string): void {
    // A cleared date field emits an empty string; keep the date it had rather
    // than fall to a range with no start.
    if (value === '') return
    setCustom(current => {
      const base = current ?? { from: dayKey(now), to: dayKey(now) }
      return which === 'from'
        ? { from: value, to: value > base.to ? value : base.to }
        : { from: value < base.from ? value : base.from, to: value }
    })
    setOffset(0)
  }

  /** Select one range, seeding a hand-picked range from the one in effect. */
  function chooseRange(id: RangeId): void {
    if (id === 'custom' && custom === undefined) {
      const current = boundsOf(rangeId, now, undefined)
      setCustom({
        from: dayKey(current.from ?? now),
        to: dayKey(current.to ?? now),
      })
    }
    setRangeId(id)
    setOffset(0)
  }

  /** Replace the whole query with one model, or with every model. */
  function chooseModel(value: string): void {
    setModel(value)
    setOffset(0)
  }

  const data = state.data
  // A provider that never reports cache writes makes a column of zeroes read as
  // a bug in this panel. When the whole match reports none, the column is
  // dropped and the summary says writes went unreported instead.
  const showCacheWrite = data !== undefined && data.totals.cacheWriteTokens > 0
  const pageSize = data !== undefined && data.limit > 0 ? data.limit : limit
  const total = data?.total ?? 0
  const totals = data?.totals
  const hitRate = totals === undefined ? undefined : cacheHitRate(totals)
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.floor(offset / pageSize) + 1
  const shownFrom = total === 0 ? 0 : offset + 1
  const shownTo = Math.min(offset + (data?.rows.length ?? 0), total)

  // The filter lists models, not routes: one model is sold through several
  // vendor routes, and a reader choosing "deepseek-v4-flash" means all of them.
  const models = useMemo(() => {
    const groups = new Map<string, {
      readonly key: string
      readonly names: string[]
      calls: number
      routes: number
    }>()
    for (const facet of state.data?.routes ?? []) {
      const key = modelKey(facet.model)
      const current = groups.get(key)
      if (current === undefined) {
        groups.set(key, { key, names: [facet.model], calls: facet.calls, routes: 1 })
      } else {
        current.names.push(facet.model)
        current.calls += facet.calls
        current.routes += 1
      }
    }
    return [...groups.values()]
      .map(group => ({ key: group.key, model: displayModel(group.names), calls: group.calls, routes: group.routes }))
      .sort((left, right) => right.calls - left.calls || left.model.localeCompare(right.model))
  }, [state.data])

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
            {RANGES.map(candidate => (
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
            onChange={event => { setSearch(event.target.value) }}
          />
        </label>

        <label className={css.callField}>
          <span>{t('callsSort')}</span>
          <select
            value={sort.id}
            onChange={(event) => {
              const next = SORTS.find(candidate => candidate.id === event.target.value)
              if (next !== undefined) {
                setSortId(next.id)
                setOffset(0)
              }
            }}
          >
            {SORTS.map(candidate => (
              <option key={candidate.id} value={candidate.id}>{t(candidate.key)}</option>
            ))}
          </select>
        </label>

        <label className={css.callField}>
          <span>{t('callsPageSize')}</span>
          <select
            value={String(limit)}
            onChange={(event) => {
              setLimit(Number(event.target.value))
              setOffset(0)
            }}
          >
            {PAGE_SIZES.map(size => <option key={size} value={String(size)}>{String(size)}</option>)}
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
            <Button variant="outline" size="sm" onClick={() => { setReload(value => value + 1) }}>
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
              onClick={() => { setOffset(Math.max(0, offset - pageSize)) }}
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
              onClick={() => { setOffset(offset + pageSize) }}
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
        <span className={css.callModelName}>{row.model}</span>
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
