/**
 * How the money figure is computed, stated where the figure is read.
 *
 * The harness records tokens and never currency, so every cost on this panel is
 * this plugin's own arithmetic over a configured rate card. That makes it an
 * estimate by construction, and the ways it can differ from an invoice —
 * prepaid credit, packages, volume discounts, aggregator markups — are exactly
 * the things a reader would otherwise assume were included. Stating the formula,
 * the rates actually in effect, and the peak schedule is what lets the number be
 * trusted as far as it goes and no further.
 *
 * The table is also the editor: the four prices of any route the window recorded
 * can be typed over, and an override is what makes the figure stop being a
 * guess for that route.
 *
 * @module dsh-local-usage/client/PricingNotes
 */
import type { ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { UsagePricingUpdate, UsageInsightsReport } from '../types.ts';
/** Props for the pricing popover's body. */
export interface PricingNotesProps {
    readonly report: UsageInsightsReport;
    /** Active locale id; rate figures are written in the reader's language. */
    readonly locale: string;
    readonly t: PropsLocale<'usage'>['t'];
    /** Compact token formatter, passed through to the editor's volume column. */
    readonly formatTokens: (value: number) => string;
    /** Persist one rate override. */
    readonly onSaveRates: (update: UsagePricingUpdate) => Promise<void>;
}
/**
 * Render the pricing body.
 * @param props - the report whose rates are in effect, the dictionary, and the write action.
 * @returns the pricing block.
 */
export declare function PricingNotes({ report, locale, t, formatTokens, onSaveRates }: PricingNotesProps): ReactNode;
