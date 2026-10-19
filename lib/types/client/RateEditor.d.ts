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
/** Props for the card table. */
export interface RateEditorProps {
    /** The cards in match order; the fallback card has an empty `match`. */
    readonly models: readonly UsageModelPrice[];
    /** Currency every price is expressed in, shown once above the table. */
    readonly currency: string;
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
export declare function RateEditor({ models, currency, t, onSave }: RateEditorProps): ReactNode;
