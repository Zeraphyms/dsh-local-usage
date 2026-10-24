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
import type { UsageCallSort, UsageCallsReport } from '../types.ts';
import type { CustomRange } from './range.ts';
import type { UsageInsightsLocaleKey } from './locales.ts';
/** Ranges the page offers, in selection order. */
export type CallsRangeId = 'today' | 'week' | 'month' | 'all' | 'custom';
export declare const CALLS_RANGES: readonly {
    readonly id: CallsRangeId;
    readonly key: UsageInsightsLocaleKey;
}[];
/** Ordering choices, the id carrying both the column and its direction. */
export type CallsSortId = 'time-desc' | 'time-asc' | 'cost-desc' | 'tokens-desc' | 'output-desc';
export interface CallsSortChoice {
    readonly id: CallsSortId;
    readonly key: UsageInsightsLocaleKey;
    readonly sort: UsageCallSort;
    readonly dir: 'asc' | 'desc';
}
export declare const CALLS_SORTS: readonly CallsSortChoice[];
/** The ordering used until the reader says otherwise. */
export declare const CALLS_DEFAULT_SORT: CallsSortChoice;
/** Page sizes offered, in the order a reader is likely to want them. */
export declare const CALLS_PAGE_SIZES: readonly number[];
/** One query fetch's state; `data` survives a later page so the table never blinks. */
export interface CallsState {
    readonly status: 'loading' | 'ready' | 'error';
    readonly data?: UsageCallsReport;
}
/** One model the filter can choose, with its calls across every route. */
export interface CallsModelOption {
    readonly key: string;
    readonly model: string;
    readonly calls: number;
}
/** Where the page starts, when a calendar or day page sent the reader here. */
export interface CallsQueryOptions {
    readonly initialFrom?: number;
    readonly initialTo?: number;
}
/** The query's state, its request's answer, and the controls that change it. */
export interface CallsQuery {
    readonly rangeId: CallsRangeId;
    readonly custom: CustomRange | undefined;
    readonly model: string;
    readonly search: string;
    readonly sort: CallsSortChoice;
    readonly limit: number;
    readonly offset: number;
    readonly state: CallsState;
    readonly data: UsageCallsReport | undefined;
    /** Models the filter can choose, most called first. */
    readonly models: readonly CallsModelOption[];
    /** Rows of the current page, and where they sit in the whole match. */
    readonly total: number;
    readonly pageSize: number;
    readonly page: number;
    readonly pages: number;
    readonly shownFrom: number;
    readonly shownTo: number;
    chooseRange: (id: CallsRangeId) => void;
    moveCustom: (which: 'from' | 'to', value: string) => void;
    chooseModel: (value: string) => void;
    writeSearch: (value: string) => void;
    chooseSort: (id: CallsSortId) => void;
    chooseLimit: (size: number) => void;
    goToOffset: (next: number) => void;
    retry: () => void;
}
/**
 * Own the call log's query and the request it implies.
 * @param options - the window a calendar or day page opened on, when it did.
 * @returns the query state, its answer, and the controls.
 */
export declare function useCallsQuery({ initialFrom, initialTo }: CallsQueryOptions): CallsQuery;
