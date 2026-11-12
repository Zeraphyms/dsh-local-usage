/** Currency changes in rate drafts preserve the amount represented by each field. */
import type { UsagePriceCurrency } from '../types.ts';
import { type ModelDraft } from './rate-draft.ts';
/** Convert a draft to another input currency using the snapshot captured on selection. */
export declare function changeDraftCurrency(draft: ModelDraft, currency: UsagePriceCurrency, rate: number): ModelDraft;
