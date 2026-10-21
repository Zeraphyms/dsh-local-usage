/**
 * The price sheet: one row per set of prices, edited where the figures are.
 *
 * Every model the window recorded gets a group of rows — one row for each price
 * set it bills at, two when it prices peak separately — under a single header that
 * names the four buckets once. That is what a price sheet is: a table whose
 * columns are read down, because the question at this page is not "what is this
 * model" but "how does its output rate compare with the one above it".
 *
 * The rows are a real table, not a grid of divs, for the same reason: a reader
 * comparing four numbers across eight models needs the columns to hold their
 * place, both against the header and while a row is being edited. Editing is a
 * mode of one model at a time: its figures become fields in exactly the cells the
 * numbers were in, its switch and its two actions sit in a footer row beneath —
 * so the columns stay readable, and nothing moves when the reader starts typing.
 *
 * Consumption is not edited here and is not folded into these numbers: the sheet
 * states what each model cost in the window beside the rates it was charged, and
 * the two stay separate.
 *
 * @module dsh-local-usage/client/RateEditor
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsagePricingUpdate } from '../types.ts'
import {
  RATE_FIELDS,
  draftsFrom,
  pendingUpdate,
  type ModelDrafts,
  type PriceSet,
  type RateField,
} from './rate-draft.ts'
import { css } from './classes.ts'
import { RateGroup, rateSignature } from './RateGroup.tsx'
import { FIELD_KEYS } from './rate-row.ts'
import type { RateRow } from './rate-row.ts'

/** How long the saved confirmation stays up. */
const CONFIRMATION_MS = 2200

/** Props for the price sheet. */
export interface RateEditorProps {
  /** One row per model the window recorded, dearest first. */
  readonly rows: readonly RateRow[]
  /** Currency every price is expressed in, shown once above the table. */
  readonly currency: string
  /** Cost formatter, for each row's own spend. */
  readonly formatCost: (value: number) => string
  /** Panel translate function. */
  readonly t: PropsLocale<'usage'>['t']
  /** Persist one update; rejects with a message the editor shows. */
  readonly onSave: (update: UsagePricingUpdate) => Promise<void>
}

/**
 * Render the price sheet.
 * @param props - the rows, the currency, the dictionary and the save action.
 * @returns the table and its one open editor, if any.
 */
export function RateEditor({ rows, currency, formatCost, t, onSave }: RateEditorProps): ReactNode {
  const models = rows.map(row => row.card)
  const [drafts, setDrafts] = useState<ModelDrafts>(() => draftsFrom(models))
  /** The model whose prices are open for editing, if any. */
  const [editing, setEditing] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  /** The sheet's own element, so focus can be taken back after a row closes. */
  const table = useRef<HTMLTableElement>(null)
  /** The model whose fields were last open, to return the caret to its word. */
  const lastOpen = useRef<string | undefined>(undefined)

  // A new report re-seeds the fields: after a save the values in effect are the
  // ones just written, and a configuration change brings new cards. The rows are
  // rebuilt on every render of the page, so the identity to watch is the price
  // configuration they carry — not the array around it, which would re-seed the
  // drafts on every keystroke's parent render and drop what was being typed.
  const signature = models
    .map(card => `${card.match}\u0000${String(card.peakEnabled)}\u0000${rateSignature(card.offPeak)}\u0000${rateSignature(card.peak)}`)
    .join('\u0001')
  useEffect(() => { setDrafts(draftsFrom(models)) }, [signature])

  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => { setSaved(false) }, CONFIRMATION_MS)
    return () => { clearTimeout(timer) }
  }, [saved])

  // Opening a row unmounts the word that was pressed, and closing it unmounts
  // the fields: without this the caret falls to the document and a keyboard
  // reader loses their place in the sheet.
  useEffect(() => {
    const previous = lastOpen.current
    lastOpen.current = editing
    const scope = table.current
    if (previous === editing || scope === null) return
    if (editing !== undefined) {
      scope.querySelector<HTMLInputElement>(`[data-rate-field="${CSS.escape(editing)}"]`)?.focus()
    } else if (previous !== undefined) {
      scope.querySelector<HTMLButtonElement>(`[data-rate-edit="${CSS.escape(previous)}"]`)?.focus()
    }
  }, [editing])

  const pending = pendingUpdate(drafts, models, editing)

  /** Write one field of one model as typed. */
  function write(model: string, set: PriceSet, field: RateField, value: string): void {
    setSaved(false)
    setFailure(undefined)
    setDrafts(current => {
      const draft = current[model]
      if (draft === undefined) return current
      return { ...current, [model]: { ...draft, [set]: { ...draft[set], [field]: value } } }
    })
  }

  /** Turn one model's peak pricing on or off. */
  function switchPeak(model: string, peakEnabled: boolean): void {
    setSaved(false)
    setFailure(undefined)
    setDrafts(current => {
      const draft = current[model]
      return draft === undefined ? current : { ...current, [model]: { ...draft, peakEnabled } }
    })
  }

  /** Open one card, discarding the previous card's unsaved draft. */
  function openEditor(model: string): void {
    if (editing !== undefined && editing !== model) {
      const previous = models.find(candidate => candidate.match === editing)
      const reset = previous === undefined ? undefined : draftsFrom([previous])[editing]
      if (reset !== undefined) {
        setDrafts(current => ({ ...current, [editing]: reset }))
      }
    }
    setSaved(false)
    setFailure(undefined)
    setEditing(model)
  }

  /** Throw the open model's edits away and close it. */
  function discard(): void {
    if (editing !== undefined) {
      const card = models.find(candidate => candidate.match === editing)
      const reset = card === undefined ? undefined : draftsFrom([card])[editing]
      if (reset !== undefined) {
        setDrafts(current => ({ ...current, [editing]: reset }))
      }
    }
    setFailure(undefined)
    setEditing(undefined)
  }

  /** Save the open model, or close it when it was left untouched. */
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
      <div className={css.rateSheet}>
        <div className={css.pricingSectionHead}>
          <h4 className={css.editorTitle}>{t('pricingModelsTitle')}</h4>
          <span className={css.priceCurrency}>{currency} / 1M</span>
        </div>

        {/* The eight fields of a card are the same columns in every row, so the
          * labels are stated once and the figures line up under them. Fixed
          * layout, so opening a row's fields cannot widen a column and shift the
          * rest of the sheet. */}
        <div className={css.rateTableWrap}>
          <table ref={table} className={`${css.projectTable} ${css.rateTable}`}>
            <caption className={css.visuallyHidden}>{t('pricingModelsTitle')}</caption>
            <colgroup>
              <col />
              <col className={css.rateColSet} />
              {RATE_FIELDS.map(field => <col key={field} className={css.rateColValue} />)}
              <col className={css.rateColUsage} />
              <col className={css.rateColAction} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">{t('pricingTableModel')}</th>
                <th scope="col">{t('pricingTablePeriod')}</th>
                {RATE_FIELDS.map(field => (
                  <th key={field} scope="col" className={css.numeric}>{t(FIELD_KEYS[field])}</th>
                ))}
                <th scope="col" className={css.numeric}>{t('pricingTableUsage')}</th>
                <th scope="col">
                  <span className={css.visuallyHidden}>{t('pricingTableActions')}</span>
                </th>
              </tr>
            </thead>
            {rows.map(row => {
              const card = row.card
              const open = editing === card.match
              const draft = open ? drafts[card.match] : undefined
              const invalid = pending.status === 'invalid' && pending.model === card.match
                ? { set: pending.set, field: pending.field }
                : undefined
              return (
                <RateGroup
                  key={card.match}
                  row={row}
                  draft={draft}
                  open={open}
                  invalid={invalid}
                  busy={busy}
                  t={t}
                  formatCost={formatCost}
                  onEdit={() => { openEditor(card.match) }}
                  onCancel={discard}
                  onSave={() => { void commit() }}
                  onPeak={enabled => { switchPeak(card.match, enabled) }}
                  onWrite={(set, field, value) => { write(card.match, set, field, value) }}
                />
              )
            })}
          </table>
        </div>

        {failure === undefined ? null : (
          <p className={css.editorError} role="alert">{t('pricingSaveFailed', { message: failure })}</p>
        )}
        {saved ? <p className={css.editorStatus} role="status">{t('pricingSaved')}</p> : null}
      </div>
    </section>
  )
}

