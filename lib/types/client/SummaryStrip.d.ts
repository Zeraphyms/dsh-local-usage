/**
 * The selected range's figures: one hero number, then the supporting tiles.
 *
 * Every figure here is scaled by one entrance share, so the strip fills in as a
 * single thing. `animate` is false for every render after the first read, which
 * is what makes a range switch swap the numbers rather than replay them.
 *
 * @module dsh-local-usage/client/SummaryStrip
 */
import type { ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { UsageInsightsReport } from '../types.ts';
export interface SummaryStripProps {
    readonly report: UsageInsightsReport;
    readonly animate: boolean;
    readonly stale: boolean;
    readonly onEntranceEnd: () => void;
    readonly t: PropsLocale<'usage'>['t'];
    readonly money: (value: number) => string;
    readonly tokens: (value: number) => string;
    readonly integer: (value: number) => string;
    readonly percent: (value: number) => string;
}
/**
 * The selected range's figures: one hero number, then the supporting tiles.
 *
 * Every figure here is scaled by one entrance share, so the strip fills in as a
 * single thing. `animate` is false for every render after the first read, which
 * is what makes a range switch swap the numbers rather than replay them.
 *
 * `stale` marks figures the reader is still looking at after the selection moved
 * on. They stay mounted and keep their own range's meaning — the strip is only
 * dimmed, never emptied, so a switch that takes a moment does not move the page.
 */
export declare function SummaryStrip({ report, animate, stale, onEntranceEnd, t, money, tokens, integer, percent }: SummaryStripProps): ReactNode;
