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

import { useRef, type ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsagePricingUpdate } from '../types.ts'
import { BUILT_IN_MATCHES } from './useRateEditor.ts'
import { RATE_FIELDS } from './rate-draft.ts'
import { css } from './classes.ts'
import { AddRateCard } from './AddRateCard.tsx'
import { RateGroup } from './RateGroup.tsx'
import { useRateEditor } from './useRateEditor.ts'
import { FIELD_KEYS } from './rate-row.ts'
import type { RateRow } from './rate-row.ts'

/** Props for the price sheet. */
export interface RateEditorProps {
  /** One row per model the window recorded, dearest first. */
  readonly rows: readonly RateRow[]
  /** Currency every price is expressed in, shown once above the table. */
  readonly currency: string
  /** Active locale id, for the rates as written. */
  readonly locale: string
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
export function RateEditor({ rows, currency, locale, formatCost, t, onSave }: RateEditorProps): ReactNode {
  const models = rows.map(row => row.card)
  const table = useRef<HTMLTableElement>(null)
  const {
    drafts, editing, busy, saved, failure, pending,
    write, switchPeak, openEditor, discard, commit, removeCard,
  } = useRateEditor({ models, onSave, table })

  // Stated rather than omitted: an empty table reads as an editor that was
  // removed, not as a window with nothing to price.
  if (models.length === 0) {
    return (
      <section className={css.pricingSection}>
        <h4 className={css.editorTitle}>{t('pricingModelsTitle')}</h4>
        <p className={css.editorHint}>{t('pricingEditorEmpty')}</p>
        <AddRateCard
          existing={[]}
          currency={currency}
          t={t}
          onSave={onSave}
        />
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
                  locale={locale}
                  t={t}
                  formatCost={formatCost}
                  onEdit={() => { openEditor(card.match) }}
                  onCancel={discard}
                  onSave={() => { void commit() }}
                  onPeak={enabled => { switchPeak(card.match, enabled) }}
                  onWrite={(set, field, value) => { write(card.match, set, field, value) }}
                  onDelete={async () => {
                    // Removing the sheet's card needs the reader's go-ahead:
                    // a user-added card leaves outright, a built-in resets,
                    // and neither action is reversible by undo.
                    if (card.match === '') return
                    if (!window.confirm(BUILT_IN_MATCHES.has(card.match) ? t('pricingResetConfirm', { match: card.match }) : t('pricingRemoveConfirm', { match: card.match }))) return
                    await removeCard(card.match)
                  }}
                  deleteLabel={card.match === '' ? undefined : BUILT_IN_MATCHES.has(card.match) ? t('pricingReset') : t('pricingRemove')}
                />
              )
            })}
          </table>
        </div>

        {failure === undefined ? null : (
          <p className={css.editorError} role="alert">{t('pricingSaveFailed', { message: failure })}</p>
        )}
        {saved ? <p className={css.editorStatus} role="status">{t('pricingSaved')}</p> : null}

        {/* A card for a model the window has not billed yet: the sheet edits what
          * exists, and this adds what is coming. */}
        <AddRateCard
          existing={models.map(card => card.match)}
          currency={currency}
          t={t}
          onSave={onSave}
        />
      </div>
    </section>
  )
}

