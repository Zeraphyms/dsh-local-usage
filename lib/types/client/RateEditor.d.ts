/**
 * The price sheet: one row per set of prices, edited where the figures are.
 *
 * Every model the window recorded gets a group of rows — one row for each price
 * set it bills at, two when it prices peak separately — under a single header that
 * names the four buckets once. That is what a price sheet is: a table whose
 * columns are read down, because the question at this page is not "what is this
 * model" but "how does its output rate compare with the one above it".
 *
 * The rows are a real table, not a grid of divs, for the same reason: a reader
 * comparing four numbers across eight models needs the columns to hold their
 * place, both against the header and while a row is being edited. Editing is a
 * mode of one model at a time: its figures become fields in exactly the cells the
 * numbers were in, its switch and its two actions sit in a footer row beneath —
 * so the columns stay readable, and nothing moves when the reader starts typing.
 *
 * Consumption is not edited here and is not folded into these numbers: the sheet
 * states what each model cost in the window beside the rates it was charged, and
 * the two stay separate.
 *
 * @module dsh-local-usage/client/RateEditor
 */
import { type ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { UsageModelPrice, UsagePricingUpdate } from '../types.ts';
/** One row of the price sheet: a model, what it spent, and the rates it is on. */
export interface RateRow {
    /** The card that prices the model — configured, edited, or the fallback's. */
    readonly card: UsageModelPrice;
    /** The model spelling to show, when the card's own match is a substring rule. */
    readonly name?: string;
    /** Tokens the model spent in the window. */
    readonly tokens: number;
    /** How many routes of the model the window recorded. */
    readonly routes: number;
    /** What the model cost over the window, shown beside its volume. */
    readonly cost: number;
    /**
     * Whether a card of its own prices the model, or the default rate does.
     *
     * A row that inherits the default is not stating this model's price — it is
     * stating the price that will be used until someone writes one — and a table
     * that shows the two identically is telling the reader something untrue.
     */
    readonly inherited: boolean;
}
/** Props for the price sheet. */
export interface RateEditorProps {
    /** One row per model the window recorded, dearest first. */
    readonly rows: readonly RateRow[];
    /** Currency every price is expressed in, shown once above the table. */
    readonly currency: string;
    /** Cost formatter, for each row's own spend. */
    readonly formatCost: (value: number) => string;
    /** Panel translate function. */
    readonly t: PropsLocale<'usage'>['t'];
    /** Persist one update; rejects with a message the editor shows. */
    readonly onSave: (update: UsagePricingUpdate) => Promise<void>;
}
/**
 * Render the price sheet.
 * @param props - the rows, the currency, the dictionary and the save action.
 * @returns the table and its one open editor, if any.
 */
export declare function RateEditor({ rows, currency, formatCost, t, onSave }: RateEditorProps): ReactNode;
