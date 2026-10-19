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

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageModelPrice, UsageRate, UsagePricingUpdate } from '../types.ts'
import {
  RATE_FIELDS,
  draftsFrom,
  pendingUpdate,
  type ModelDrafts,
  type PriceSet,
  type RateField,
} from './rate-draft.ts'
import { css } from './classes.ts'

/** How long the saved confirmation stays up. */
const CONFIRMATION_MS = 2200

/** The dictionary key of each bucket's column label. */
const FIELD_KEYS: Record<RateField, 'pricingColumnInput' | 'pricingColumnCacheRead' | 'pricingColumnCacheWrite' | 'pricingColumnOutput'> = {
  input: 'pricingColumnInput',
  cacheRead: 'pricingColumnCacheRead',
  cacheWrite: 'pricingColumnCacheWrite',
  output: 'pricingColumnOutput',
}

/** One row of the price sheet: a model, what it spent, and the rates it is on. */
export interface RateRow {
  /** The card that prices the model — configured, edited, or the fallback's. */
  readonly card: UsageModelPrice
  /** Tokens the model spent in the window. */
  readonly tokens: number
  /** How many routes of the model the window recorded. */
  readonly routes: number
  /**
   * Whether the model is priced by its own card rather than the default.
   *
   * A row that inherits the default rate is not stating this model's price — it is
   * stating the price that will be used until someone writes one — and a table
   * that shows the two identically is telling the reader something untrue.
   */
  readonly inherited: boolean
  /** The model's share of the window's busiest model, for the row's volume bar. */
  readonly share: number
}

/** Props for the card table. */
export interface RateEditorProps {
  /** One row per model the window recorded, dearest first. */
  readonly rows: readonly RateRow[]
  /** Currency every price is expressed in, shown once above the table. */
  readonly currency: string
  /** Panel translate function. */
  readonly t: PropsLocale<'usage'>['t']
  /** Persist one update; rejects with a message the editor shows. */
  readonly onSave: (update: UsagePricingUpdate) => Promise<void>
}

/**
 * Render the price cards.
 * @param props - the cards, currency, dictionary and the save action.
 * @returns the table and its one open editor, if any.
 */
export function RateEditor({ rows, currency, t, onSave }: RateEditorProps): ReactNode {
  const models = rows.map(row => row.card)
  const [drafts, setDrafts] = useState<ModelDrafts>(() => draftsFrom(models))
  /** The model whose prices are open for editing, if any. */
  const [editing, setEditing] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [failure, setFailure] = useState<string | undefined>(undefined)

  // A new report re-seeds the fields: after a save the values in effect are the
  // ones just written, and a configuration change brings new cards.
  useEffect(() => { setDrafts(draftsFrom(models)) }, [models])

  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => { setSaved(false) }, CONFIRMATION_MS)
    return () => { clearTimeout(timer) }
  }, [saved])

  const pending = useMemo(() => pendingUpdate(drafts, models), [drafts, models])

  /** Write one field of one card as typed. */
  function write(model: string, set: PriceSet, field: RateField, value: string): void {
    setSaved(false)
    setFailure(undefined)
    setDrafts(current => {
      const draft = current[model]
      if (draft === undefined) return current
      return { ...current, [model]: { ...draft, [set]: { ...draft[set], [field]: value } } }
    })
  }

  /** Turn one card's peak pricing on or off. */
  function switchPeak(model: string, peakEnabled: boolean): void {
    setSaved(false)
    setFailure(undefined)
    setDrafts(current => {
      const draft = current[model]
      return draft === undefined ? current : { ...current, [model]: { ...draft, peakEnabled } }
    })
  }

  /** Throw the open card's edits away and close it. */
  function discard(): void {
    setDrafts(draftsFrom(models))
    setFailure(undefined)
    setEditing(undefined)
  }

  /** Save the open card, or close it when it was left untouched. */
  async function commit(): Promise<void> {
    if (pending.status === 'empty') {
      setEditing(undefined)
      return
    }
    if (pending.status !== 'ready') return
    setBusy(true)
    setFailure(undefined)
    try {
      await onSave(pending.update)
      setSaved(true)
      setEditing(undefined)
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  // Stated rather than omitted: an empty table reads as an editor that was
  // removed, not as a window with nothing to price.
  if (models.length === 0) {
    return (
      <section className={css.pricingSection}>
        <h4 className={css.editorTitle}>{t('pricingModelsTitle')}</h4>
        <p className={css.editorHint}>{t('pricingEditorEmpty')}</p>
      </section>
    )
  }

  return (
    <section className={css.pricingSection}>
      <div className={css.pricingSectionHead}>
        <h4 className={css.editorTitle}>{t('pricingModelsTitle')}</h4>
        <span className={css.priceCurrency}>{currency} / 1M</span>
      </div>
      <p className={css.editorHint}>{t('pricingModelsHint')}</p>

      {/* One header for the whole table: the four numbers mean the same thing in
        * every card, so they are labelled once rather than eight times a model. */}
      <div className={css.rateHead} aria-hidden="true">
        <span />
        <span>{t('pricingPriceSet')}</span>
        {RATE_FIELDS.map(field => <span key={field} className={css.numeric}>{t(FIELD_KEYS[field])}</span>)}
        <span />
      </div>

      <div className={css.editorCards}>
        {rows.map(row => {
          const card = row.card
          const draft = drafts[card.match]
          const open = editing === card.match
          const invalid = pending.status === 'invalid' && pending.model === card.match ? pending : undefined
          return (
            <div key={card.match} className={css.rateCard} data-open={open}>
              <div className={css.rateCardHead}>
                <code className={css.priceMatch} title={card.match === '' ? t('pricingFallback') : card.match}>
                  {card.match === '' ? t('pricingFallback') : card.match}
                </code>
                {row.inherited ? <span className={css.rateDefaultTag}>{t('pricingInherited')}</span> : null}
                {/* The row's own weight: a hairline whose length is its share of
                  * the busiest model, under the name it belongs to. */}
                <span className={css.rateBar} aria-hidden="true">
                  <span style={{ inlineSize: `${String(Math.round((row.share <= 0 ? 0 : row.share) * 100))}%` }} />
                </span>

                <span className={css.rateVolume}>
                  {formatCompact(row.tokens)} · {t('pricingRouteCount', { count: String(row.routes) })}
                </span>
                {open
                  ? (
                    <>
                      <button
                        type="button"
                        className={css.rateAction}
                        disabled={busy}
                        onClick={discard}
                      >
                        {t('pricingCancel')}
                      </button>
                      <button
                        type="button"
                        className={css.rateAction}
                        disabled={busy}
                        onClick={() => { void commit() }}
                      >
                        {t('pricingSaveOne')}
                      </button>
                    </>
                  )
                  : (
                    <button
                      type="button"
                      className={css.rateAction}
                      onClick={() => {
                        setSaved(false)
                        setFailure(undefined)
                        setEditing(card.match)
                      }}
                    >
                      {t('pricingEdit')}
                    </button>
                  )}
              </div>

              {open && draft !== undefined
                ? (
                  <>
                    <div className={css.rateCardHead}>
                      <label className={css.editorToggle}>
                        <input
                          type="checkbox"
                          checked={draft.peakEnabled}
                          disabled={busy}
                          onChange={event => { switchPeak(card.match, event.target.checked) }}
                        />
                        <span>{t('pricingPeakEnabled')}</span>
                      </label>
                    </div>
                    {draft.peakEnabled ? (
                      <PriceRow
                        label={t('pricingPeakPrices')}
                        card={card.match}
                        set="peak"
                        draft={draft}
                        invalid={invalid?.set === 'peak' ? invalid.field : undefined}
                        busy={busy}
                        t={t}
                        write={write}
                      />
                    ) : null}
                    <PriceRow
                      label={draft.peakEnabled ? t('pricingOffPeakPrices') : t('pricingFlatPrice')}
                      card={card.match}
                      set="offPeak"
                      draft={draft}
                      invalid={invalid?.set === 'offPeak' ? invalid.field : undefined}
                      busy={busy}
                      t={t}
                      write={write}
                    />
                  </>
                )
                : (
                  <>
                    {card.peakEnabled
                      ? <PriceRowRead label={t('pricingPeakPrices')} rate={card.peak} />
                      : null}
                    <PriceRowRead
                      label={card.peakEnabled ? t('pricingOffPeakPrices') : t('pricingFlatPrice')}
                      rate={card.offPeak}
                    />
                  </>
                )}
            </div>
          )
        })}
      </div>

      {failure === undefined ? null : (
        <p className={css.editorError} role="alert">{t('pricingSaveFailed', { message: failure })}</p>
      )}
      {saved ? <p className={css.editorStatus} role="status">{t('pricingSaved')}</p> : null}
    </section>
  )
}

/** One set of four prices, read-only, aligned with the table's columns. */
function PriceRowRead({ label, rate }: { readonly label: string; readonly rate: UsageRate }): ReactNode {
  return (
    <div className={css.rateRow}>
      <span />
      <span className={css.rateSetLabel}>{label}</span>
      {RATE_FIELDS.map(field => (
        <span key={field} className={css.rateValue}>{formatPrice(rate[field])}</span>
      ))}
      <span />
    </div>
  )
}

/** One set of four prices, editable. */
function PriceRow({ card, set, label, draft, invalid, busy, t, write }: {
  readonly card: string
  readonly set: PriceSet
  readonly label: string
  readonly draft: { readonly peak: Record<RateField, string>; readonly offPeak: Record<RateField, string> }
  /** The field of this set that holds something which is not a price. */
  readonly invalid: RateField | undefined
  readonly busy: boolean
  readonly t: PropsLocale<'usage'>['t']
  readonly write: (model: string, set: PriceSet, field: RateField, value: string) => void
}): ReactNode {
  const name = card === '' ? t('pricingFallback') : card
  return (
    <div className={css.rateRow}>
      <span />
      <span className={css.rateSetLabel}>{label}</span>
      {RATE_FIELDS.map(field => (
        <span key={field} className={css.rateInputCell}>
          <input
            className={css.editorField}
            type="text"
            inputMode="decimal"
            aria-label={`${name} ${label} ${t(FIELD_KEYS[field])}`}
            aria-invalid={invalid === field}
            value={draft[set][field]}
            disabled={busy}
            onChange={event => { write(card, set, field, event.target.value) }}
          />
        </span>
      ))}
      <span />
    </div>
  )
}

/** A token count as the row's volume: thousands, millions, billions. */
function formatCompact(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  return String(value)
}

/** A price as it reads in the table: the number as typed, without grouping. */
function formatPrice(value: number): string {
  return Number.isFinite(value) ? String(value) : '—'
}
