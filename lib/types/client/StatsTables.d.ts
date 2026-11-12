/**
 * The window's spend, listed by the route that billed it, the directory it
 * happened in, and the conversation it belonged to.
 *
 * The figure above answers what the window's shape was; these answer what it was
 * made of, and they answer it with numbers rather than with curves: a table can
 * be read exactly, compared down a column, and scanned for the one row that is
 * out of proportion, which is what a reader does with a model's, a project's or
 * a session's spend. All three are the same table, so all are drawn by the same
 * code; the session table's rows open the call log narrowed to that session.
 *
 * @module dsh-local-usage/client/StatsTables
 */
import type { ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { UsageInsightsReport } from '../types.ts';
/** Props for the tables. */
export interface StatsTablesProps {
    /** The report for the range the reader selected. */
    readonly report: UsageInsightsReport;
    readonly t: PropsLocale<'usage'>['t'];
    readonly formatCost: (value: number) => string;
    readonly formatInteger: (value: number) => string;
    /** Open the call log narrowed to one session, when a session row is clicked. */
    readonly onOpenCalls?: (sessionId: string) => void;
}
/**
 * Render the window's spend by model, by project and by session.
 * @param props - the report, the formatters, and the session drill-down.
 * @returns the three tables.
 */
export declare function StatsTables({ report, t, formatCost, formatInteger, onOpenCalls }: StatsTablesProps): ReactNode;
