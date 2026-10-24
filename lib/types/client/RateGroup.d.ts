/**
 * One model's block of rate rows, its edit fields, and its save footer.
 *
 * The group renders a table body so the column widths stay those of the sheet;
 * it owns no state beyond what the editor passes down.
 *
 * @module dsh-local-usage/client/RateGroup
 */
import type { ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import { type ModelDraft, type PriceSet, type RateField } from './rate-draft.ts';
import type { RateRow } from './rate-row.ts';
/** Props for one model's block of rows. */
interface RateGroupProps {
    readonly row: RateRow;
    /** The draft being edited, present only while this group is open. */
    readonly draft: ModelDraft | undefined;
    readonly open: boolean;
    /** The field that holds something which is not a price, when it is here. */
    readonly invalid: {
        readonly set: PriceSet;
        readonly field: RateField;
    } | undefined;
    readonly busy: boolean;
    /** Active locale id, for the rates as written. */
    readonly locale: string;
    readonly t: PropsLocale<'usage'>['t'];
    readonly formatCost: (value: number) => string;
    readonly onEdit: () => void;
    readonly onCancel: () => void;
    readonly onSave: () => void;
    readonly onPeak: (enabled: boolean) => void;
    readonly onWrite: (set: PriceSet, field: RateField, value: string) => void;
}
/**
 * Render one model: its rate rows, its volume, and — while it is open — its
 * switch and actions in a footer row.
 *
 * The footer is a row of the table rather than a cell inside one of the rate
 * rows: the switches come after every field in the tab order, and the footer can
 * hold both actions at the width the other rows use.
 *
 * @param props - one row's card, its draft, and the editor's handlers.
 * @returns a table body, one group per model.
 */
export declare function RateGroup({ row, draft, open, invalid, busy, locale, t, formatCost, onEdit, onCancel, onSave, onPeak, onWrite, }: RateGroupProps): ReactNode;
export {};
