/** Currency changes in rate drafts preserve the amount represented by each field. */
import type { UsagePriceCurrency } from '../types.ts'
import { RATE_FIELDS, type ModelDraft, type PriceFields } from './rate-draft.ts'

/** Convert a draft to another input currency using the snapshot captured on selection. */
export function changeDraftCurrency(draft: ModelDraft, currency: UsagePriceCurrency, rate: number): ModelDraft {
  const from = draft.currency ?? 'CNY'
  if (from === currency || !Number.isFinite(rate) || rate <= 0) return draft
  const multiplier = from === 'USD' ? draft.exchangeRate ?? rate : 1 / rate
  const fields = (source: PriceFields): PriceFields => {
    const next = { ...source }
    for (const field of RATE_FIELDS) {
      const text = source[field].trim()
      const value = Number(text)
      if (text !== '' && Number.isFinite(value) && value >= 0) next[field] = String(Number((value * multiplier).toPrecision(15)))
    }
    return next
  }
  return { ...draft, currency, exchangeRate: rate, peak: fields(draft.peak), offPeak: fields(draft.offPeak) }
}
