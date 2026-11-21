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

import { useState, type ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageModelPrice, UsagePricingUpdate, UsagePriceCurrency } from '../types.ts'
import { RATE_FIELDS, type RateField, type PriceFields } from './rate-draft.ts'
import { changeDraftCurrency } from './rate-currency.ts'
import { PriceCurrencySelect } from './PriceCurrencySelect.tsx'
import { FIELD_KEYS } from './rate-row.ts'
import { css } from './classes.ts'

/** The four prices as typed, plus the match rule and the peak switch. */
interface AddDraft {
  match: string
  peakEnabled: boolean
  tierEnabled: boolean
  tierThresholdK: string
  tier: PriceFields
  peak: PriceFields
  offPeak: PriceFields
  currency: UsagePriceCurrency
  exchangeRate?: number
}

/** An empty draft: every field blank, flat-priced, matching nothing. */
function emptyDraft(): AddDraft {
  const fields = () => ({ input: '', cacheRead: '', cacheWrite: '', output: '' })
  return { match: '', peakEnabled: false, tierEnabled: false, tierThresholdK: '', tier: fields(), peak: fields(), offPeak: fields(), currency: 'CNY' }
}

/** Props for the add-card form. */
export interface AddRateCardProps {
  /** Every match already priced, so a duplicate can be refused. */
  readonly existing: readonly string[]
  readonly currency: string
  readonly exchangeRate?: number | undefined
  readonly t: PropsLocale<'usage'>['t']
  /** Persist one update; rejects with a message the form shows. */
  readonly onSave: (update: UsagePricingUpdate) => Promise<void>
}

/**
 * Render the add-model form, folded away behind a button until it is opened.
 * @param props - the existing matches, the currency and the save action.
 * @returns the folded form, or the button that opens it.
 */
export function AddRateCard({ existing, currency, t, onSave, exchangeRate }: AddRateCardProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<AddDraft>(emptyDraft)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  // The field a refused value sits in: `{ model }` names the match input itself.
  const [invalid, setInvalid] = useState<'model' | RateField | undefined>(undefined)

  const write = (field: RateField, value: string): void => {
    setDraft(current => ({ ...current, offPeak: { ...current.offPeak, [field]: value } }))
    setInvalid(undefined)
  }
  const writePeak = (field: RateField, value: string): void => {
    setDraft(current => ({ ...current, peak: { ...current.peak, [field]: value } }))
    setInvalid(undefined)
  }
  const writeTier = (field: RateField, value: string): void => {
    setDraft(current => ({ ...current, tier: { ...current.tier, [field]: value } }))
    setInvalid(undefined)
  }

  /** One typed bucket: a number, `undefined` for blank, `null` for text that is not a price. */
  const readField = (text: string): number | undefined | null => {
    const trimmed = text.trim()
    if (trimmed.length === 0) return undefined
    const value = Number(trimmed)
    return Number.isFinite(value) && value >= 0 ? value : null
  }

  /** Submit the card, refusing a duplicate match and a price that is not one. */
  const commit = async (): Promise<void> => {
    const match = draft.match.trim()
    if (match.length === 0) { setInvalid('model'); return }
    if (existing.some(candidate => candidate === match)) {
      setFailure(t('pricingAddDuplicate', { match }))
      return
    }
    const offPeak: Record<string, number> = {}
    for (const field of RATE_FIELDS) {
      const value = readField(draft.offPeak[field] ?? '')
      if (value === null) { setInvalid(field); return }
      if (value !== undefined) offPeak[field] = value
    }
    if (Object.keys(offPeak).length === 0) { setInvalid('input'); return }
    const peak: Record<string, number> = {}
    if (draft.peakEnabled && !draft.tierEnabled) {
      for (const field of RATE_FIELDS) {
        const value = readField(draft.peak[field] ?? '')
        if (value === null) { setInvalid(field); return }
        if (value !== undefined) peak[field] = value
      }
      if (Object.keys(peak).length === 0) { setInvalid('input'); return }
    }
    // The context tier is all-or-nothing: a threshold and an above-threshold
    // set, both sane, or none of it.
    let tierFields: { tierEnabled: true; tierThresholdK: number; tier: Record<string, number> } | undefined
    if (draft.tierEnabled) {
      const threshold = Number(draft.tierThresholdK.trim())
      if (!Number.isFinite(threshold) || threshold <= 0) { setFailure(t('pricingTierThresholdInvalid')); return }
      const tier: Record<string, number> = {}
      for (const field of RATE_FIELDS) {
        const value = readField(draft.tier[field] ?? '')
        if (value === null) { setInvalid(field); return }
        if (value !== undefined) tier[field] = value
      }
      if (Object.keys(tier).length === 0) { setInvalid('input'); return }
      tierFields = { tierEnabled: true, tierThresholdK: threshold, tier }
    }
    setBusy(true)
    setFailure(undefined)
    try {
      await onSave({
        models: {
          [match]: {
            ...draft.currency === 'USD' ? { currency: draft.currency } : {},
            peakEnabled: draft.peakEnabled && !draft.tierEnabled,
            offPeak: {
              input: offPeak.input ?? 0,
              cacheRead: offPeak.cacheRead ?? 0,
              cacheWrite: offPeak.cacheWrite ?? 0,
              output: offPeak.output ?? 0,
            },
            peak: {
              input: peak.input ?? 0,
              cacheRead: peak.cacheRead ?? 0,
              cacheWrite: peak.cacheWrite ?? 0,
              output: peak.output ?? 0,
            },
            ...tierFields === undefined ? {} : {
              tierEnabled: true,
              tierThresholdK: tierFields.tierThresholdK,
              tier: {
                input: tierFields.tier.input ?? 0,
                cacheRead: tierFields.tier.cacheRead ?? 0,
                cacheWrite: tierFields.tier.cacheWrite ?? 0,
                output: tierFields.tier.output ?? 0,
              },
            },
          },
        },
      })
      setDraft(emptyDraft())
      setOpen(false)
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className={css.rateAddRow}>
        <button
          type="button"
          className={css.rateAction}
          onClick={() => { setOpen(true); setFailure(undefined); setInvalid(undefined) }}
        >
          {t('pricingAdd')}
        </button>
        {failure === undefined ? null : (
          <p className={css.editorError} role="alert">{t('pricingSaveFailed', { message: failure })}</p>
        )}
      </div>
    )
  }

  const fieldInput = (set: 'offPeak' | 'peak', field: RateField): ReactNode => (
    <input
      className={`${css.editorField} ${css.rateField}`}
      type="text"
      inputMode="decimal"
      aria-label={`${t('pricingAdd')} ${t(FIELD_KEYS[field])}`}
      aria-invalid={invalid === field}
      placeholder={set === 'peak' && !draft.peakEnabled ? '—' : '0'}
      disabled={busy || (set === 'peak' && !draft.peakEnabled)}
      value={draft[set][field] ?? ''}
      onChange={event => { (set === 'peak' ? writePeak : write)(field, event.target.value) }}
    />
  )

  return (
    <div className={css.rateAddRow}>
      <PriceCurrencySelect
        value={draft.currency}
        disabled={busy}
        usdAvailable={currency === 'CNY' && exchangeRate !== undefined}
        onChange={value => {
          if (exchangeRate === undefined) return
          setDraft(current => ({ ...current, ...changeDraftCurrency(current, value, exchangeRate), currency: value }))
        }}
        t={t}
      />
      <div className={css.rateAddForm}>
        <label className={css.rateAddField}>
          <span>{t('pricingAddMatch')}</span>
          <input
            className={`${css.editorField} ${css.rateField}`}
            type="text"
            aria-label={t('pricingAddMatch')}
            aria-invalid={invalid === 'model'}
            placeholder="provider/model"
            disabled={busy}
            value={draft.match}
            onChange={event => { setDraft(current => ({ ...current, match: event.target.value })); setInvalid(undefined) }}
          />
        </label>
        {RATE_FIELDS.map(field => (
          <label key={field} className={css.rateAddField}>
            <span>{t(FIELD_KEYS[field])}</span>
            {fieldInput('offPeak', field)}
          </label>
        ))}
        <label className={css.editorToggle}>
          <input
            type="checkbox"
            checked={draft.tierEnabled}
            disabled={busy}
            onChange={event => { setDraft(current => ({ ...current, tierEnabled: event.target.checked, peakEnabled: event.target.checked ? false : current.peakEnabled })); setInvalid(undefined) }}
          />
          <span>{t('pricingTierEnabled')}</span>
        </label>
        <label className={css.editorToggle}>
          <input
            type="checkbox"
            checked={draft.peakEnabled}
            disabled={busy || draft.tierEnabled}
            onChange={event => { setDraft(current => ({ ...current, peakEnabled: event.target.checked })); setInvalid(undefined) }}
          />
          <span>{t('pricingPeakEnabled')}</span>
        </label>
      </div>
      {draft.tierEnabled ? (
        <div className={css.rateAddForm}>
          <label className={css.rateAddField}>
            <span>{t('pricingTierThreshold')}</span>
            <input
              className={css.editorField + ' ' + css.rateField}
              type="text"
              inputMode="decimal"
              aria-label={t('pricingTierThreshold')}
              disabled={busy}
              value={draft.tierThresholdK}
              onChange={event => { setDraft(current => ({ ...current, tierThresholdK: event.target.value })); setInvalid(undefined) }}
            />
          </label>
          {RATE_FIELDS.map(field => (
            <label key={field} className={css.rateAddField}>
              <span>{t('pricingTierSet', { field: t(FIELD_KEYS[field]) })}</span>
              <input
                className={css.editorField + ' ' + css.rateField}
                type="text"
                inputMode="decimal"
                aria-label={t('pricingTierSet', { field: t(FIELD_KEYS[field]) })}
                disabled={busy}
                value={draft.tier[field] ?? ''}
                onChange={event => { writeTier(field, event.target.value) }}
              />
            </label>
          ))}
        </div>
      ) : null}
      {draft.peakEnabled ? (
        <div className={css.rateAddForm}>
          {RATE_FIELDS.map(field => (
            <label key={field} className={css.rateAddField}>
              <span>{t('pricingPeakSet', { field: t(FIELD_KEYS[field]) })}</span>
              {fieldInput('peak', field)}
            </label>
          ))}
        </div>
      ) : null}
      <div className={css.rateToolbar}>
        <span className={css.priceCurrency}>{draft.currency} / 1M</span>
        <span className={css.rateEditorActions}>
          <button
            type="button"
            className={css.rateAction}
            disabled={busy}
            onClick={() => { setDraft(emptyDraft()); setOpen(false); setFailure(undefined); setInvalid(undefined) }}
          >
            {t('pricingCancel')}
          </button>
          <button
            type="button"
            className={`${css.rateAction} ${css.rateCommit}`}
            disabled={busy}
            onClick={() => { void commit() }}
          >
            {t('pricingSaveOne')}
          </button>
        </span>
      </div>
      {failure === undefined ? null : (
        <p className={css.editorError} role="alert">{t('pricingSaveFailed', { message: failure })}</p>
      )}
    </div>
  )
}

/** Unused today but kept beside the form's types: one card as the update writes it. */
export type AddedCard = UsageModelPrice
