/**
 * The panel's report reads and the states they settle into.
 *
 * Three reads are kept apart on purpose: the year's window is the expensive one
 * and may open every log; the selected range is a re-price over the same folds
 * and must wait for the window; the day page is another re-price over one day.
 * Keeping the ordering here means `UsagePanel` composes pages rather than
 * coordinating four independent fetches.
 *
 * @module dsh-local-usage/client/useUsageReports
 */
import type { UsageInsightsProgress, UsageInsightsReport } from '../types.ts';
import type { SummaryState } from './summary-state.ts';
/** One report fetch's state. */
export type ReportState = {
    readonly status: 'idle';
} | {
    readonly status: 'loading';
} | {
    readonly status: 'error';
} | {
    readonly status: 'ready';
    readonly report: UsageInsightsReport;
};
/** The day page's own fold, kept apart so a slow one never blanks the calendar. */
export type DayState = ReportState;
/** One report request as the panel hands it to its Host. */
export interface ReportRequest {
    readonly from: number;
    readonly to: number;
    readonly refresh?: boolean;
    readonly compare?: boolean;
    readonly onProgress?: (progress: UsageInsightsProgress) => void;
}
/** What the hook needs from the panel. */
export interface UseUsageReportsOptions {
    readonly active: boolean;
    readonly report: (request: ReportRequest) => Promise<UsageInsightsReport>;
    readonly gridFrom: number;
    readonly gridTo: number;
    readonly rangeFrom: number;
    readonly rangeTo: number;
    readonly rangeIsWindow: boolean;
    readonly rangeKey: string;
    readonly selectedDay: string | undefined;
    readonly pricingRevision: number;
}
/** The three reads and the controls that retry or recount them. */
export interface UsageReports {
    readonly gridState: ReportState;
    readonly summaryState: SummaryState;
    readonly dayState: DayState;
    readonly progress: UsageInsightsProgress | undefined;
    /** Ask for the year again, bypassing the Host's folds once. */
    readonly recount: () => void;
    /** Retry the year without bypassing the folds. */
    readonly retryGrid: () => void;
    /** Retry only the selected range's fold. */
    readonly retrySummary: () => void;
    /** Retry only the day page's fold. */
    readonly retryDay: () => void;
}
/**
 * Own the panel's three report reads and their pages' states.
 * @param options - the active panel, report reader, windows and retry revisions.
 * @returns the states and the retry/recount actions.
 */
export declare function useUsageReports({ active, report, gridFrom, gridTo, rangeFrom, rangeTo, rangeIsWindow, rangeKey, selectedDay, pricingRevision, }: UseUsageReportsOptions): UsageReports;
