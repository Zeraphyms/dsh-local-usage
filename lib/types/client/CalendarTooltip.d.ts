/**
 * The calendar's hover card: one day's exact figures, pinned to its cell.
 *
 * Portalled to the document because any ancestor with a filter or transform
 * would otherwise become the containing block for this fixed card. The card is
 * presentational; the calendar owns the hovered cell.
 *
 * @module dsh-local-usage/client/CalendarTooltip
 */
import type { ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { UsageDayRow } from '../types.ts';
/** The hovered cell and where its card is pinned. */
export interface Hover {
    readonly key: string;
    readonly weekday: number;
    readonly row: UsageDayRow | undefined;
    readonly level: number;
    readonly x: number;
    readonly y: number;
    readonly placement: 'above' | 'below';
}
export interface CalendarTooltipProps {
    readonly hover: Hover;
    /** Cell edge, so the card can sit under the cell when flipped. */
    readonly cellSize: number;
    readonly t: PropsLocale<'usage'>['t'];
    readonly formatCost: (value: number) => string;
    readonly formatInteger: (value: number) => string;
    readonly formatDay: (day: string) => string;
}
export declare function CalendarTooltip({ hover, cellSize, t, formatCost, formatInteger, formatDay, }: CalendarTooltipProps): ReactNode;
