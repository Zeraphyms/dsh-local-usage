/**
 * The per-route rate table, editable.
 *
 * Every route the window recorded is listed with the rate it is actually priced
 * at, and each of the four buckets can be typed over. This is the correction for
 * the rule table's one real failure mode: a substring rule claiming a route it
 * was never written for, which the source badge on each row makes visible before
 * anything is edited.
 *
 * A row is only written when it differs from what is in effect, so opening the
 * editor and saving changes nothing; clearing an overridden row returns the route
 * to its rule instead of pricing it at zero.
 *
 * @module dsh-local-usage/client/RateEditor
 */
import { type ReactNode } from 'react';
import type { UsagePricingUpdate, UsageRouteRate } from '../types.ts';
import type { UsageInsightsLocaleKey } from './locales.ts';
/** Props for the rate editor. */
export interface RateEditorProps {
    /** Routes the window recorded, ordered by token volume. */
    readonly routes: readonly UsageRouteRate[];
    /** Currency every rate is expressed in, shown once above the table. */
    readonly currency: string;
    /** Panel translate function. */
    readonly t: (key: UsageInsightsLocaleKey, params?: Record<string, string>) => string;
    /** Compact token formatter, for the volume column. */
    readonly formatTokens: (value: number) => string;
    /** Persist one update; rejects with a message the editor shows. */
    readonly onSave: (update: UsagePricingUpdate) => Promise<void>;
}
/**
 * Render the editable rate table.
 * @param props - routes, currency, dictionary, formatter and the save action.
 * @returns the editor.
 */
export declare function RateEditor({ routes, currency, t, formatTokens, onSave }: RateEditorProps): ReactNode;
