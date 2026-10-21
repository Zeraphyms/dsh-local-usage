/**
 * The rate editor's editing state: drafts, the open model, save status and the
 * one-row-only commit rule.
 *
 * Kept apart from the table so the render can be read as columns and rows. The
 * hook owns the transition rules that are easy to get wrong: switching rows
 * discards the previous draft, discard resets only the open row, and a save
 * validates only the model whose editor is open.
 *
 * @module dsh-local-usage/client/useRateEditor
 */
import { type RefObject } from 'react';
import type { UsageModelPrice, UsagePricingUpdate } from '../types.ts';
import { type ModelDrafts, type PriceSet, type RateDraftResult, type RateField } from './rate-draft.ts';
export interface UseRateEditorOptions {
    readonly models: readonly UsageModelPrice[];
    readonly onSave: (update: UsagePricingUpdate) => Promise<void>;
    readonly table: RefObject<HTMLTableElement>;
}
export interface RateEditorState {
    readonly drafts: ModelDrafts;
    readonly editing: string | undefined;
    readonly busy: boolean;
    readonly saved: boolean;
    readonly failure: string | undefined;
    readonly pending: RateDraftResult;
    readonly write: (model: string, set: PriceSet, field: RateField, value: string) => void;
    readonly switchPeak: (model: string, peakEnabled: boolean) => void;
    readonly openEditor: (model: string) => void;
    readonly discard: () => void;
    readonly commit: () => Promise<void>;
}
/**
 * Own the rate editor's state and transitions.
 * @param options - the cards in effect, the save action and the sheet ref.
 * @returns drafts, the open row and the handlers the table needs.
 */
export declare function useRateEditor({ models, onSave, table }: UseRateEditorOptions): RateEditorState;
