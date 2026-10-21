/**
 * The range selector and, while it is open, the two custom date fields.
 *
 * The controls are presentational: the panel owns the range and the date
 * clamping, so switching a range is one state update there rather than a second
 * source of truth here.
 *
 * @module dsh-local-usage/client/RangeControls
 */

import type { ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { RANGES } from './range.ts'
import type { CustomRange } from './range.ts'
import { css } from './classes.ts'

export interface RangeControlsProps {
  readonly rangeId: string
  readonly customRange: CustomRange | undefined
  readonly windowFromDay: string
  readonly windowToDay: string
  readonly t: PropsLocale<'usage'>['t']
  readonly onSelect: (id: string) => void
  readonly onCustomDay: (which: 'from' | 'to', value: string) => void
}

export function RangeControls({
  rangeId, customRange, windowFromDay, windowToDay, t, onSelect, onCustomDay,
}: RangeControlsProps): ReactNode {
  return (
    <div className={css.rangeBlock}>
      <div className={css.ranges} role="group" aria-label={t('rangeLabel')}>
        {RANGES.map(candidate => (
          <button
            key={candidate.id}
            type="button"
            className={css.range}
            aria-pressed={candidate.id === rangeId}
            onClick={() => { onSelect(candidate.id) }}
          >
            {t(candidate.key)}
          </button>
        ))}
      </div>
      {rangeId === 'custom' && customRange !== undefined
        ? (
          <div className={css.rangeCustom}>
            <label className={css.rangeField}>
              <span>{t('rangeFrom')}</span>
              <input
                type="date"
                value={customRange.from}
                min={windowFromDay}
                max={windowToDay}
                onChange={event => { onCustomDay('from', event.target.value) }}
              />
            </label>
            <label className={css.rangeField}>
              <span>{t('rangeTo')}</span>
              <input
                type="date"
                value={customRange.to}
                min={windowFromDay}
                max={windowToDay}
                onChange={event => { onCustomDay('to', event.target.value) }}
              />
            </label>
          </div>
        )
        : null}
    </div>
  )
}
