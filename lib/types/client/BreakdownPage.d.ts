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
import type { ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { UsageInsightsReport } from '../types.ts';
/** Props for the detail view. */
export interface BreakdownPageProps {
    /** The report for the range the reader selected; absent until its fold lands. */
    readonly report: UsageInsightsReport | undefined;
    /** The range's own label, so the page names the window it describes. */
    readonly rangeLabel: string;
    /** Failed to fold: the page states it rather than rendering an empty one. */
    readonly failed: boolean;
    readonly t: PropsLocale<'usage'>['t'];
    readonly formatCost: (value: number) => string;
    readonly formatTokens: (value: number) => string;
    readonly formatInteger: (value: number) => string;
    readonly formatPercent: (value: number) => string;
    /** Localized date for a day key, used to state the compared window's bounds. */
    readonly formatDay: (day: string) => string;
    /** Leave the page and return to the calendar. */
    readonly onBack: () => void;
    /** Retry a fold that failed. */
    readonly onRetry: () => void;
}
/**
 * Render the range's detail view.
 * @param props - the range's report, its label, the formatters, and the controls.
 * @returns the page.
 */
export declare function BreakdownPage(props: BreakdownPageProps): ReactNode;
