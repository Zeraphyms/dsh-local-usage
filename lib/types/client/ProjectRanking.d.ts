/**
 * Where a window's tokens went: one row per working directory, longest bar first.
 *
 * The calendar says when a profile spent; the summary says how much. Neither
 * answers *which project*, which is the question a day's figures raise the moment
 * they are read. This list answers it over the same window as the summary above
 * it — the range selector switches both, so the two can never describe different
 * periods.
 *
 * Ten rows by default, because a profile with forty directories has a long tail
 * nobody reads, and the tail stays one click away rather than being dropped.
 *
 * @module dsh-local-usage/client/ProjectRanking
 */
import { type ReactNode } from 'react';
import type { UsageInsightsReport } from '../types.ts';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
/** Rows shown before the reader asks for the rest. */
export declare const DEFAULT_RANKING_LIMIT = 10;
/** Props for the ranking. */
export interface ProjectRankingProps {
    /** The report for the range currently selected above. */
    readonly report: UsageInsightsReport;
    /** The range's own label, stated so the list names its window. */
    readonly rangeLabel: string;
    /** Rows shown while collapsed. */
    readonly limit: number;
    readonly t: PropsLocale<'usage'>['t'];
    readonly formatCost: (value: number) => string;
    readonly formatTokens: (value: number) => string;
    readonly formatInteger: (value: number) => string;
}
/**
 * Render the project ranking.
 * @param props - the range's report, its label, the row limit, and the formatters.
 * @returns the ranking section.
 */
export declare function ProjectRanking({ report, rangeLabel, limit, t, formatCost, formatTokens, formatInteger, }: ProjectRankingProps): ReactNode;
