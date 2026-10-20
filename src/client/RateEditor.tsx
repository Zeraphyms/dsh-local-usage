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
import type { UsageModelPrice, UsageRate, UsagePricingUpdate } from '../types.ts'
import {
  RATE_FIELDS,
  draftsFrom,
  pendingUpdate,
  type ModelDraft,
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
  /** What the model cost over the window, shown beside its volume. */
  readonly cost: number
  /**
   * Whether a card of its own prices the model, or the default rate does.
   *
   * A row that inherits the default is not stating this model's price — it is
   * stating the price that will be used until someone writes one — and a table
   * that shows the two identically is telling the reader something untrue.
   */
  readonly inherited: boolean
}

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

  const pending = pendingUpdate(drafts, models)

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

  /** Throw the open model's edits away and close it. */
  function discard(): void {
    setDrafts(draftsFrom(models))
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
                  onEdit={() => {
                    setSaved(false)
                    setFailure(undefined)
                    setEditing(card.match)
                  }}
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

/** The price fields a group shows, one row per set, in reading order. */
interface PriceSetRow {
  readonly set: PriceSet
  readonly label: string
  readonly rate: UsageRate
}

/** Props for one model's block of rows. */
interface RateGroupProps {
  readonly row: RateRow
  /** The draft being edited, present only while this group is open. */
  readonly draft: ModelDraft | undefined
  readonly open: boolean
  /** The field that holds something which is not a price, when it is here. */
  readonly invalid: { readonly set: PriceSet; readonly field: RateField } | undefined
  readonly busy: boolean
  readonly t: PropsLocale<'usage'>['t']
  readonly formatCost: (value: number) => string
  readonly onEdit: () => void
  readonly onCancel: () => void
  readonly onSave: () => void
  readonly onPeak: (enabled: boolean) => void
  readonly onWrite: (set: PriceSet, field: RateField, value: string) => void
}

/**
 * Render one model: its rate rows, its volume, and — while it is open — its
 * switch and actions in a footer row.
 *
 * The footer is a row of the table rather than a cell inside one of the rate
 * rows: the switches come after every field in the tab order, and the footer can
 * hold both actions at the width the other rows use.
 *
 * @param props - one row's card, its draft, and the editor's handlers.
 * @returns a table body, one group per model.
 */
function RateGroup({
  row, draft, open, invalid, busy, t, formatCost, onEdit, onCancel, onSave, onPeak, onWrite,
}: RateGroupProps): ReactNode {
  const card = row.card
  const editing = open && draft !== undefined
  const name = card.match === '' ? t('pricingFallback') : card.match
  const sets = priceSets(card, draft, editing, t)
  const volume = t('pricingVolumeLine', {
    tokens: formatCompact(row.tokens),
    // English needs the singular; Chinese does not, and states the same string.
    routes: t(row.routes === 1 ? 'pricingRouteCountOne' : 'pricingRouteCount', {
      count: String(row.routes),
    }),
  })

  return (
    <tbody className={css.rateGroup} data-open={open}>
      {sets.map((entry, index) => (
        <tr key={entry.set}>
          {index === 0
            ? (
              <th scope="rowgroup" rowSpan={sets.length} className={css.rateModel}>
                <span className={css.rateModelLine}>
                  <code className={css.priceMatch} title={name}>{name}</code>
                  {row.inherited
                    ? <span className={css.rateDefaultTag}>{t('pricingInherited')}</span>
                    : null}
                </span>
                {/* Below the fold the usage column is gone, and with it the
                  * only place the cost is stated: it rides under the name. */}
                <span className={css.rateModelMeta}>
                  {t('pricingModelMeta', { cost: formatCost(row.cost), volume })}
                </span>
              </th>
            )
            : null}
          <td className={css.rateSet}>{entry.label}</td>
          {RATE_FIELDS.map(field => (
            <td key={field} className={css.numeric}>
              {editing
                ? (
                  <input
                    className={`${css.editorField} ${css.rateField}`}
                    type="text"
                    inputMode="decimal"
                    aria-label={`${name} ${entry.label} ${t(FIELD_KEYS[field])}`}
                    aria-invalid={invalid?.set === entry.set && invalid.field === field}
                    data-rate-field={card.match}
                    value={draft[entry.set][field]}
                    disabled={busy}
                    onChange={event => { onWrite(entry.set, field, event.target.value) }}
                  />
                )
                : formatPrice(entry.rate[field])}
            </td>
          ))}
          {index === 0
            ? (
              <td rowSpan={sets.length} className={`${css.numeric} ${css.rateUsage}`}>
                <span className={css.rateCost}>{formatCost(row.cost)}</span>
                <span className={css.rateVolume} title={volume}>{volume}</span>
              </td>
            )
            : null}
          {index === 0 && !editing
            ? (
              <td rowSpan={sets.length} className={css.rateActions}>
                <button
                  type="button"
                  className={css.rateAction}
                  data-rate-edit={card.match}
                  onClick={onEdit}
                >
                  {t('pricingEdit')}
                </button>
              </td>
            )
            : null}
        </tr>
      ))}

      {editing
        ? (
          <tr>
            <td colSpan={8} className={css.rateEditorCell}>
              <div className={css.rateToolbar}>
                <label className={css.editorToggle}>
                  <input
                    type="checkbox"
                    checked={draft.peakEnabled}
                    disabled={busy}
                    onChange={event => { onPeak(event.target.checked) }}
                  />
                  <span>{t('pricingPeakEnabled')}</span>
                </label>
                <span className={css.rateEditorActions}>
                  <button type="button" className={css.rateAction} disabled={busy} onClick={onCancel}>
                    {t('pricingCancel')}
                  </button>
                  <button
                    type="button"
                    className={`${css.rateAction} ${css.rateCommit}`}
                    disabled={busy}
                    onClick={onSave}
                  >
                    {t('pricingSaveOne')}
                  </button>
                </span>
              </div>
            </td>
          </tr>
        )
        : null}
    </tbody>
  )
}

/**
 * The price sets one model bills at, in the order the sheet lists them.
 *
 * While the model is open the draft's switch decides, so turning peak pricing
 * off takes the peak row away with it — the reader is choosing the shape of the
 * card they are writing, not just a number in it.
 *
 * @param card - the card in effect.
 * @param draft - the open draft, when this model is being edited.
 * @param editing - whether the draft governs the card's shape.
 * @param t - dictionary lookup, for the row labels.
 * @returns one entry per set, peak first.
 */
function priceSets(
  card: UsageModelPrice,
  draft: ModelDraft | undefined,
  editing: boolean,
  t: PropsLocale<'usage'>['t'],
): PriceSetRow[] {
  const peakEnabled = editing && draft !== undefined ? draft.peakEnabled : card.peakEnabled
  const offPeak: PriceSetRow = {
    set: 'offPeak',
    label: peakEnabled ? t('rateSetOffPeak') : t('rateSetFlat'),
    rate: card.offPeak,
  }
  return peakEnabled
    ? [{ set: 'peak', label: t('rateSetPeak'), rate: card.peak }, offPeak]
    : [offPeak]
}

/** A price set reduced to what tells two configurations apart. */
function rateSignature(rate: UsageRate): string {
  return RATE_FIELDS.map(field => String(rate[field])).join(',')
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
