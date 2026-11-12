/**
 * Adding a price card for a model nothing in the window has billed yet.
 *
 * The sheet edits the models a window recorded; a model the reader is about to
 * use has no row there, and "wait until it costs money" is the wrong answer to
 * "how do I stop this from being priced at the fallback". One form, one card:
 * the match the reader writes is the rule the fold will match routes by, and the
 * prices are the ones this plugin will bill with from the next report on.
 *
 * Deliberately outside the sheet's editor state machine: a card being added has
 * no row to turn into fields, and the sheet's one-open-row rule would make the
 * two forms fight over the mode. The form holds its own draft and commits
 * through the same save action.
 *
 * @module dsh-local-usage/client/AddRateCard
 */
import { type ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { UsageModelPrice, UsagePricingUpdate } from '../types.ts';
/** Props for the add-card form. */
export interface AddRateCardProps {
    /** Every match already priced, so a duplicate can be refused. */
    readonly existing: readonly string[];
    readonly currency: string;
    readonly exchangeRate?: number | undefined;
    readonly t: PropsLocale<'usage'>['t'];
    /** Persist one update; rejects with a message the form shows. */
    readonly onSave: (update: UsagePricingUpdate) => Promise<void>;
}
/**
 * Render the add-model form, folded away behind a button until it is opened.
 * @param props - the existing matches, the currency and the save action.
 * @returns the folded form, or the button that opens it.
 */
export declare function AddRateCard({ existing, currency, t, onSave, exchangeRate }: AddRateCardProps): ReactNode;
/** Unused today but kept beside the form's types: one card as the update writes it. */
export type AddedCard = UsageModelPrice;
