/**
 * The call log's query: its filters, its page, and the one request they imply.
 *
 * The page renders; this hook owns what the page is asking for. The query is a
 * Host request rather than a filter over rows already in the browser — a year of
 * calls is far more than a page of them — so the filters live here as state, the
 * request is a single effect keyed on everything that changes it, and the answer
 * keeps its previous rows while the next page is in flight.
 *
 * @module dsh-local-usage/client/useCallsQuery
 */

import { useEffect, useMemo, useState } from 'react'
import type { UsageCallSort, UsageCallsReport } from '../types.ts'
import { dayKey } from './heatmap-grid.ts'
import { displayModel, modelKey } from '../model-name.ts'
import { CALLS_PATH } from './routes.ts'
import { rangeBounds } from './range.ts'
import type { CustomRange } from './range.ts'
import { normalizeCallsReport } from './wire-calls.ts'
import type { UsageInsightsLocaleKey } from './locales.ts'

/** Ranges the page offers, in selection order. */
export type CallsRangeId = 'today' | 'week' | 'month' | 'all' | 'custom'

export const CALLS_RANGES: readonly { readonly id: CallsRangeId; readonly key: UsageInsightsLocaleKey }[] = [
  { id: 'today', key: 'rangeDay' },
  { id: 'week', key: 'range7' },
  { id: 'month', key: 'rangeMonth' },
  { id: 'all', key: 'callsRangeAll' },
  { id: 'custom', key: 'rangeCustom' },
]

/** Ordering choices, the id carrying both the column and its direction. */
export type CallsSortId = 'time-desc' | 'time-asc' | 'cost-desc' | 'tokens-desc' | 'output-desc'

export interface CallsSortChoice {
  readonly id: CallsSortId
  readonly key: UsageInsightsLocaleKey
  readonly sort: UsageCallSort
  readonly dir: 'asc' | 'desc'
}

export const CALLS_SORTS: readonly CallsSortChoice[] = [
  { id: 'time-desc', key: 'callsSortTimeDesc', sort: 'time', dir: 'desc' },
  { id: 'time-asc', key: 'callsSortTimeAsc', sort: 'time', dir: 'asc' },
  { id: 'cost-desc', key: 'callsSortCostDesc', sort: 'cost', dir: 'desc' },
  { id: 'tokens-desc', key: 'callsSortTokensDesc', sort: 'tokens', dir: 'desc' },
  { id: 'output-desc', key: 'callsSortOutputDesc', sort: 'output', dir: 'desc' },
]

/** The ordering used until the reader says otherwise. */
export const CALLS_DEFAULT_SORT: CallsSortChoice = CALLS_SORTS[0] ?? {
  id: 'time-desc',
  key: 'callsSortTimeDesc',
  sort: 'time',
  dir: 'desc',
}

/** Page sizes offered, in the order a reader is likely to want them. */
export const CALLS_PAGE_SIZES: readonly number[] = [50, 100, 200]

/** One query fetch's state; `data` survives a later page so the table never blinks. */
export interface CallsState {
  readonly status: 'loading' | 'ready' | 'error'
  readonly data?: UsageCallsReport
}

/** One model the filter can choose, with its calls across every route. */
export interface CallsModelOption {
  readonly key: string
  readonly model: string
  readonly calls: number
}

/**
 * Inclusive bounds of one selected range, in Unix epoch milliseconds.
 *
 * The presets are the panel's own (see `range.ts`); only `all` is the log's, an
 * unbounded query the calendar has no equivalent for.
 */
function boundsOf(id: CallsRangeId, now: number, custom: CustomRange | undefined): {
  readonly from?: number
  readonly to?: number
} {
  if (id === 'all') return {}
  const [from, to] = rangeBounds(id === 'today' ? 'day' : id, now, custom)
  return { from, to }
}

/** Where the page starts, when a calendar or day page sent the reader here. */
export interface CallsQueryOptions {
  readonly initialFrom?: number
  readonly initialTo?: number
}

/** The query's state, its request's answer, and the controls that change it. */
export interface CallsQuery {
  readonly rangeId: CallsRangeId
  readonly custom: CustomRange | undefined
  readonly model: string
  readonly search: string
  readonly sort: CallsSortChoice
  readonly limit: number
  readonly offset: number
  readonly state: CallsState
  readonly data: UsageCallsReport | undefined
  /** Models the filter can choose, most called first. */
  readonly models: readonly CallsModelOption[]
  /** Rows of the current page, and where they sit in the whole match. */
  readonly total: number
  readonly pageSize: number
  readonly page: number
  readonly pages: number
  readonly shownFrom: number
  readonly shownTo: number
  chooseRange: (id: CallsRangeId) => void
  moveCustom: (which: 'from' | 'to', value: string) => void
  chooseModel: (value: string) => void
  writeSearch: (value: string) => void
  chooseSort: (id: CallsSortId) => void
  chooseLimit: (size: number) => void
  goToOffset: (next: number) => void
  retry: () => void
}

/**
 * Own the call log's query and the request it implies.
 * @param options - the window a calendar or day page opened on, when it did.
 * @returns the query state, its answer, and the controls.
 */
export function useCallsQuery({ initialFrom, initialTo }: CallsQueryOptions): CallsQuery {
  // The page fixes its frame at mount; a log left open across midnight keeps
  // answering the window it was opened on.
  const now = useMemo(() => Date.now(), [])
  const [rangeId, setRangeId] = useState<CallsRangeId>(initialFrom === undefined ? 'week' : 'custom')
  const [custom, setCustom] = useState<CustomRange | undefined>(
    initialFrom === undefined
      ? undefined
      : { from: dayKey(initialFrom), to: dayKey(initialTo ?? initialFrom) },
  )
  const [model, setModel] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [sortId, setSortId] = useState<CallsSortId>(CALLS_DEFAULT_SORT.id)
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
  const sort = CALLS_SORTS.find(candidate => candidate.id === sortId) ?? CALLS_DEFAULT_SORT
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
    // oxlint-disable-next-line react-hooks/exhaustive-deps
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
  function chooseRange(id: CallsRangeId): void {
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

  const data = state.data
  const pageSize = data !== undefined && data.limit > 0 ? data.limit : limit
  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.floor(offset / pageSize) + 1
  const shownFrom = total === 0 ? 0 : offset + 1
  const shownTo = Math.min(offset + (data?.rows.length ?? 0), total)

  // The filter lists models, not routes: one model is sold through several vendor
  // routes, and a reader choosing "deepseek-v4-flash" means all of them.
  const models = useMemo(() => {
    const groups = new Map<string, { readonly key: string; names: string[]; calls: number }>()
    for (const facet of state.data?.routes ?? []) {
      const key = modelKey(facet.model)
      const current = groups.get(key)
      if (current === undefined) {
        groups.set(key, { key, names: [facet.model], calls: facet.calls })
      } else {
        current.names.push(facet.model)
        current.calls += facet.calls
      }
    }
    return [...groups.values()]
      .map(group => ({ key: group.key, model: displayModel(group.names), calls: group.calls }))
      .sort((left, right) => right.calls - left.calls || left.model.localeCompare(right.model))
  }, [state.data])

  return {
    rangeId,
    custom,
    model,
    search,
    sort,
    limit,
    offset,
    state,
    data,
    models,
    total,
    pageSize,
    page,
    pages,
    shownFrom,
    shownTo,
    chooseRange,
    moveCustom,
    chooseModel: (value) => { setModel(value); setOffset(0) },
    writeSearch: (value) => { setSearch(value) },
    chooseSort: (id) => { setSortId(id); setOffset(0) },
    chooseLimit: (size) => { setLimit(size); setOffset(0) },
    goToOffset: (next) => { setOffset(next) },
    retry: () => { setReload(value => value + 1) },
  }
}
