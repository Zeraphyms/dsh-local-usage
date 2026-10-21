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
import { type ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
/** Props for the call-log page. */
export interface CallsPageProps {
    /** Active locale id, for figures and the timestamp's shape. */
    readonly locale: string;
    readonly t: PropsLocale<'usage'>['t'];
    readonly formatCost: (value: number) => string;
    readonly formatTokens: (value: number) => string;
    readonly formatInteger: (value: number) => string;
    readonly formatPercent: (value: number) => string;
    /** First instant of the window the page should open on, when a day sent the reader here. */
    readonly initialFrom?: number;
    /** Last instant of that window. */
    readonly initialTo?: number;
    /** Label for the way back, which differs between the calendar and a day page. */
    readonly backLabel?: string;
    /** Leave the call log. */
    readonly onBack: () => void;
}
/**
 * Render the call log.
 * @param props - the formatters, the optional starting window and the way back.
 * @returns the page.
 */
export declare function CallsPage({ locale, t, formatCost, formatTokens, formatInteger, formatPercent, initialFrom, initialTo, backLabel, onBack, }: CallsPageProps): ReactNode;
