/**
 * The price cards, one per model, edited one at a time.
 *
 * A price sheet and a form are different things. Most visits to this page end
 * without a change — a reader comes to see what a model costs, or which card
 * claimed a route — so the card opens as a table row: the model, whether it
 * prices peak, and its eight numbers under one header that says which column is
 * which. Editing is a mode of one card at a time, because the alternative was a
 * wall of eight inputs per model with no column labels and one save button at the
 * bottom that could not say what it would write.
 *
 * Consumption is not edited here and is not folded into these numbers: the page
 * states the routes beside the cards, and the two figures stay separate.
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
    /** Its share of the window's spend, for the row's bar. */
    readonly share: number;
}
/**
 * The rows the sheet lists separately, and those still on the default rate.
 *
 * A model priced by its own card states its price; a model inheriting the default
 * states only what will be charged until someone writes one. Shown identically,
 * the table would tell the reader something untrue — and shown as a per-row tag,
 * the tag drowned the list once a profile had a dozen unpriced models. They are
 * two groups now, and the second one is a to-do list.
 */
/** Props for the card table. */
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
 * Render the price cards.
 * @param props - the cards, currency, dictionary and the save action.
 * @returns the table and its one open editor, if any.
 */
export declare function RateEditor({ rows, currency, formatCost, t, onSave }: RateEditorProps): ReactNode;
