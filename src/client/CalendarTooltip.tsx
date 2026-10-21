/**
 * The calendar's hover card: one day's exact figures, pinned to its cell.
 *
 * Portalled to the document because any ancestor with a filter or transform
 * would otherwise become the containing block for this fixed card. The card is
 * presentational; the calendar owns the hovered cell.
 *
 * @module dsh-local-usage/client/CalendarTooltip
 */

import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageDayRow } from '../types.ts'
import { WEEKDAY_KEYS } from './heatmap-grid.ts'
import { tokensOf } from './heatmap-shade.ts'
import { css } from './classes.ts'

/** The hovered cell and where its card is pinned. */
export interface Hover {
  readonly key: string
  readonly weekday: number
  readonly row: UsageDayRow | undefined
  readonly level: number
  readonly x: number
  readonly y: number
  readonly placement: 'above' | 'below'
}

export interface CalendarTooltipProps {
  readonly hover: Hover
  /** Cell edge, so the card can sit under the cell when flipped. */
  readonly cellSize: number
  readonly t: PropsLocale<'usage'>['t']
  readonly formatCost: (value: number) => string
  readonly formatInteger: (value: number) => string
  readonly formatDay: (day: string) => string
}

export function CalendarTooltip({
  hover, cellSize, t, formatCost, formatInteger, formatDay,
}: CalendarTooltipProps): ReactNode {
  return createPortal(
    <div
      className={css.tooltip}
      role="tooltip"
      data-placement={hover.placement}
      style={{ left: hover.x, top: hover.placement === 'above' ? hover.y : hover.y + cellSize + 8 }}
    >
      <div className={css.tooltipHead}>
        <span className={css.tooltipDate}>{formatDay(hover.key)}</span>
        <span className={css.tooltipWeekday}>{t(WEEKDAY_KEYS[hover.weekday] ?? 'wd.0')}</span>
      </div>
      {hover.row === undefined ? (
        <p className={css.tooltipEmpty}>{t('noUsageDay')}</p>
      ) : (
        <>
          <div className={css.tooltipHero}>
            <span className={css.tooltipDot} data-level={hover.level} aria-hidden="true" />
            <span className={css.tooltipHeroLabel}>{t('cost')}</span>
            <span className={css.tooltipHeroValue}>{formatCost(hover.row.cost)}</span>
          </div>
          <dl className={css.tooltipRows}>
            <div>
              <dt>{t('totalTokens')}</dt>
              <dd>{formatInteger(tokensOf(hover.row))}</dd>
            </div>
            <div>
              <dt>{t('inputTokens')}</dt>
              <dd>{formatInteger(hover.row.uncachedInputTokens)}</dd>
            </div>
            <div>
              <dt>{t('outputTokens')}</dt>
              <dd>{formatInteger(hover.row.outputTokens)}</dd>
            </div>
            <div>
              <dt>{t('cacheRead')}</dt>
              <dd>{formatInteger(hover.row.cacheReadTokens)}</dd>
            </div>
            <div>
              <dt>{t('calls')}</dt>
              <dd>{formatInteger(hover.row.calls)}</dd>
            </div>
          </dl>
        </>
      )}
    </div>,
    document.body,
  )
}
