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
import type { UsageModelPrice, UsagePricingUpdate } from '../types.ts'
import { RATE_FIELDS, type RateField } from './rate-draft.ts'
import { FIELD_KEYS } from './rate-row.ts'
import { css } from './classes.ts'

/** The four prices as typed, plus the match rule and the peak switch. */
interface AddDraft {
  match: string
  peakEnabled: boolean
  peak: Record<string, string>
  offPeak: Record<string, string>
}

/** An empty draft: every field blank, flat-priced, matching nothing. */
function emptyDraft(): AddDraft {
  const fields = () => ({ input: '', cacheRead: '', cacheWrite: '', output: '' })
  return { match: '', peakEnabled: false, peak: fields(), offPeak: fields() }
}

/** Props for the add-card form. */
export interface AddRateCardProps {
  /** Every match already priced, so a duplicate can be refused. */
  readonly existing: readonly string[]
  readonly currency: string
  readonly t: PropsLocale<'usage'>['t']
  /** Persist one update; rejects with a message the form shows. */
  readonly onSave: (update: UsagePricingUpdate) => Promise<void>
}

/**
 * Render the add-model form, folded away behind a button until it is opened.
 * @param props - the existing matches, the currency and the save action.
 * @returns the folded form, or the button that opens it.
 */
export function AddRateCard({ existing, currency, t, onSave }: AddRateCardProps): ReactNode {
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
    if (draft.peakEnabled) {
      for (const field of RATE_FIELDS) {
        const value = readField(draft.peak[field] ?? '')
        if (value === null) { setInvalid(field); return }
        if (value !== undefined) peak[field] = value
      }
      if (Object.keys(peak).length === 0) { setInvalid('input'); return }
    }
    setBusy(true)
    setFailure(undefined)
    try {
      await onSave({
        models: {
          [match]: {
            peakEnabled: draft.peakEnabled,
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
            checked={draft.peakEnabled}
            disabled={busy}
            onChange={event => { setDraft(current => ({ ...current, peakEnabled: event.target.checked })); setInvalid(undefined) }}
          />
          <span>{t('pricingPeakEnabled')}</span>
        </label>
      </div>
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
        <span className={css.priceCurrency}>{currency} / 1M</span>
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
