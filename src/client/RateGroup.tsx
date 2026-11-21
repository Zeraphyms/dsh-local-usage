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
import { PriceCurrencySelect } from './PriceCurrencySelect.tsx'
import type { UsagePriceCurrency } from '../types.ts'

/** The price fields a group shows, one row per set, in reading order. */
interface PriceSetRow {
  /** Which set this row edits: a peak half, the flat base, or the context tier. */
  readonly set: PriceSet | 'tier'
  readonly label: string
  readonly rate: UsageRate
}

/**
 * Which dimension governs the sheet rows while this group is open.
 *
 * Peak and context tier are alternatives, never a matrix: one request is billed
 * by the time of day or by how long its prompt was, and the editor shows the
 * reader exactly the rows their card will use.
 */
type PriceDimension = 'peak' | 'context'

/** Props for one model's block of rows. */
interface RateGroupProps {
  readonly row: RateRow
  /** The draft being edited, present only while this group is open. */
  readonly draft: ModelDraft | undefined
  readonly open: boolean
  /** The field that holds something which is not a price, when it is here. */
  readonly invalid: { readonly set: PriceSet; readonly field: RateField } | undefined
  /** Why the typed match rule was refused, while this group is open. */
  readonly matchError: 'empty' | 'duplicate' | undefined
  /** Why the context tier cannot bill, while this group is open. */
  readonly tierError: 'threshold' | 'tier' | undefined
  readonly busy: boolean
  /** Active locale id, for the rates as written. */
  readonly locale: string
  readonly t: PropsLocale<'usage'>['t']
  readonly formatCost: (value: number) => string
  readonly onEdit: () => void
  readonly onCancel: () => void
  readonly onSave: () => void
  readonly usdAvailable: boolean
  readonly onMatch: (value: string) => void
  readonly onTier: (enabled: boolean) => void
  readonly onTierField: (field: RateField, value: string) => void
  readonly onTierThreshold: (value: string) => void
  readonly onCurrency: (currency: UsagePriceCurrency) => void
  readonly onPeak: (enabled: boolean) => void
  readonly onWrite: (set: PriceSet, field: RateField, value: string) => void
  /** Delete this card edit, shown only while the group is open. */
  readonly onDelete?: () => void
  /** Label for the delete action: remove for a user-added card, reset for a built-in. */
  readonly deleteLabel?: string
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
  row, draft, open, invalid, matchError, tierError, busy, locale, t, formatCost, onEdit, onCancel, onSave, onPeak, onWrite, onDelete, deleteLabel, usdAvailable, onMatch, onTier, onTierField, onTierThreshold, onCurrency,
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
          <td className={css.rateSet + ' ' + css.rateCenter}>{entry.label}<span className={css.rateUnit}>{card.currency === 'USD' ? ' · USD' : ''}</span></td>
          {RATE_FIELDS.map(field => (
            <td key={field} className={css.numeric + ' ' + css.rateCenter}>
              {editing
                ? (
                  <input
                    className={`${css.editorField} ${css.rateField}`}
                    type="text"
                    inputMode="decimal"
                    aria-label={`${name} ${entry.label} ${t(FIELD_KEYS[field])}`}
                    aria-invalid={invalid?.set === entry.set && invalid.field === field}
                    data-rate-field={card.match}
                    value={entry.set === 'tier' ? draft.tier[field] : draft[entry.set][field]}
                    disabled={busy}
                    onChange={event => { if (entry.set === 'tier') onTierField(field, event.target.value); else onWrite(entry.set as PriceSet, field, event.target.value) }}
                  />
                )
                : formatRate(entry.rate[field], locale, card.currency)}
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
              <label className={css.matchEdit}>
                <span>{t('pricingAddMatch')}</span>
                <input
                  className={css.editorField}
                  type="text"
                  aria-label={t('pricingAddMatch')}
                  aria-invalid={matchError !== undefined}
                  placeholder="provider/model"
                  disabled={busy}
                  value={draft.match}
                  onChange={event => { onMatch(event.target.value) }}
                />
                <span className={css.currencyHint}>{t('pricingMatchHint')}</span>
                {matchError === undefined ? null : (
                  <span className={css.editorError} role="alert">
                    {t(matchError === 'empty' ? 'pricingMatchEmpty' : 'pricingMatchDuplicate', { match: draft.match.trim() })}
                  </span>
                )}
              </label>
              <PriceCurrencySelect value={draft.currency ?? 'CNY'} disabled={busy} usdAvailable={usdAvailable} onChange={onCurrency} t={t} />
              <div className={css.rateToolbar}>
                <label className={css.editorToggle}>
                  <input
                    type="checkbox"
                    checked={draft.tierEnabled === true}
                    disabled={busy}
                    onChange={event => { onTier(event.target.checked) }}
                  />
                  <span>{t('pricingTierEnabled')}</span>
                </label>
                {draft.tierEnabled === true ? (
                  <>
                    <label className={css.tierThreshold}>
                      <span>{t('pricingTierThreshold')}</span>
                      <input
                        className={css.editorField}
                        type="text"
                        inputMode="decimal"
                        aria-label={t('pricingTierThreshold')}
                        disabled={busy}
                        value={draft.tierThresholdK ?? ''}
                        onChange={event => { onTierThreshold(event.target.value) }}
                      />
                    </label>
                    <span className={css.currencyHint}>{t('pricingTierHint')}</span>
                    {tierError === undefined ? null : (
                      <span className={css.editorError} role="alert">
                        {t(tierError === 'threshold' ? 'pricingTierThresholdInvalid' : 'pricingTierInvalid')}
                      </span>
                    )}
                  </>
                ) : null}
                <label className={css.editorToggle}>
                  <input
                    type="checkbox"
                    checked={draft.peakEnabled}
                    disabled={busy || draft.tierEnabled === true}
                    onChange={event => { onPeak(event.target.checked) }}
                  />
                  <span>{t('pricingPeakEnabled')}</span>
                </label>
                <span className={css.rateEditorActions}>
                                    {onDelete === undefined || deleteLabel === undefined ? null : (
                    <button
                      type="button"
                      className={css.rateAction}
                      disabled={busy}
                      onClick={() => { onDelete() }}
                    >
                      {deleteLabel}
                    </button>
                  )}
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
function priceDimension(card: UsageModelPrice, draft: ModelDraft | undefined, editing: boolean): PriceDimension {
  const tierEnabled = editing && draft !== undefined ? draft.tierEnabled === true : card.tierEnabled === true
  return tierEnabled ? 'context' : 'peak'
}

function priceSets(
  card: UsageModelPrice,
  draft: ModelDraft | undefined,
  editing: boolean,
  t: PropsLocale<'usage'>['t'],
): PriceSetRow[] {
  const dimension = priceDimension(card, draft, editing)
  if (dimension === 'context') {
    // The base set bills at or below the threshold; the tier row bills above it.
    return [
      { set: 'offPeak', label: t('rateSetContextBase'), rate: card.offPeak },
      { set: 'tier', label: t('rateSetContextTier'), rate: card.tier ?? card.offPeak },
    ]
  }
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
