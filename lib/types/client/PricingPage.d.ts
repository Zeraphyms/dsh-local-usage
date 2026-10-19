/**
 * The prices, and what they are computed over, on a page of their own.
 *
 * These were hover panels beside the figures. A hover is the wrong gesture for
 * this material: the reader comes here to *type* prices, and a panel that closes
 * when the pointer leaves it cannot be typed into — every field it holds is one
 * slip away from being dismissed. A page keeps its state, takes the width the
 * eight field columns need, and matches the day view this panel already has.
 *
 * Three sections, in the order a reader needs them: what the figure means, the
 * cards they can correct, and the routes those cards price — normalized by model,
 * because that is the unit pricing is stated in.
 *
 * @module dsh-local-usage/client/PricingPage
 */
import type { ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { UsageInsightsReport, UsagePricingUpdate } from '../types.ts';
/** Props for the pricing page. */
export interface PricingPageProps {
    /** The year's report: prices and route volumes are read from it. */
    readonly report: UsageInsightsReport;
    /** Week columns the calendar spans, stated in the provenance section. */
    readonly weeks: number;
    /** Active locale id, for the grouped counts. */
    readonly locale: string;
    readonly t: PropsLocale<'usage'>['t'];
    /** Persist one change to the model prices. */
    readonly onSaveRates: (update: UsagePricingUpdate) => Promise<void>;
    /** Leave the page and return to the calendar. */
    readonly onBack: () => void;
}
/**
 * Render the pricing page.
 * @param props - the report, the dictionary, the formatters and the controls.
 * @returns the page.
 */
export declare function PricingPage({ report, weeks, locale, t, onSaveRates, onBack, }: PricingPageProps): ReactNode;
