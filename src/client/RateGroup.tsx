/**
 * One model's block of rate rows, its edit fields, and its save footer.
 *
 * The group renders a table body so the column widths stay those of the sheet;
 * it owns no state beyond what the editor passes down.
 *
 * @module dsh-local-usage/client/RateGroup
 */

import type { ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageModelPrice, UsageRate } from '../types.ts'
import {
  RATE_FIELDS,
  type ModelDraft,
  type PriceSet,
  type RateField,
} from './rate-draft.ts'
import { FIELD_KEYS } from './rate-row.ts'
import { formatCompact, formatRate } from './format.ts'
import type { RateRow } from './rate-row.ts'
import { css } from './classes.ts'

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
  /** Active locale id, for the rates as written. */
  readonly locale: string
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
export function RateGroup({
  row, draft, open, invalid, busy, locale, t, formatCost, onEdit, onCancel, onSave, onPeak, onWrite,
}: RateGroupProps): ReactNode {
  const card = row.card
  const editing = open && draft !== undefined
  const name = row.name ?? (card.match === '' ? t('pricingFallback') : card.match)
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
                : formatRate(entry.rate[field], locale)}
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
          {index === 0
            ? (
              // Held open while the model is edited, empty: the column keeps its
              // place, and the block's right edge stays a filled edge instead of
              // ending where the last figure happens to stop.
              <td rowSpan={sets.length} className={css.rateActions}>
                {editing
                  ? null
                  : (
                    <button
                      type="button"
                      className={css.rateAction}
                      data-rate-edit={card.match}
                      onClick={onEdit}
                    >
                      {t('pricingEdit')}
                    </button>
                  )}
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
