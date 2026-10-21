/**
 * The range selector and, while it is open, the two custom date fields.
 *
 * The controls are presentational: the panel owns the range and the date
 * clamping, so switching a range is one state update there rather than a second
 * source of truth here.
 *
 * @module dsh-local-usage/client/RangeControls
 */
import type { ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { CustomRange } from './range.ts';
export interface RangeControlsProps {
    readonly rangeId: string;
    readonly customRange: CustomRange | undefined;
    readonly windowFromDay: string;
    readonly windowToDay: string;
    readonly t: PropsLocale<'usage'>['t'];
    readonly onSelect: (id: string) => void;
    readonly onCustomDay: (which: 'from' | 'to', value: string) => void;
}
export declare function RangeControls({ rangeId, customRange, windowFromDay, windowToDay, t, onSelect, onCustomDay, }: RangeControlsProps): ReactNode;
