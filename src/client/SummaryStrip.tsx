/**
 * The selected range's figures: one hero number, then the supporting tiles.
 *
 * Every figure here is scaled by one entrance share, so the strip fills in as a
 * single thing. `animate` is false for every render after the first read, which
 * is what makes a range switch swap the numbers rather than replay them.
 *
 * @module dsh-local-usage/client/SummaryStrip
 */

import type { ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageInsightsReport } from '../types.ts'
import { cacheHitRate } from './cache-rate.ts'
import { useEntrance } from './count-up.ts'
import { figureRoom } from './format.ts'
import { Tile } from './Tile.tsx'
import { tokensOf } from './tokens.ts'
import { css } from './classes.ts'

export interface SummaryStripProps {
  readonly report: UsageInsightsReport
  readonly animate: boolean
  readonly stale: boolean
  readonly onEntranceEnd: () => void
  readonly t: PropsLocale<'usage'>['t']
  readonly money: (value: number) => string
  readonly tokens: (value: number) => string
  readonly integer: (value: number) => string
  readonly percent: (value: number) => string
}

/**
 * The selected range's figures: one hero number, then the supporting tiles.
 *
 * Every figure here is scaled by one entrance share, so the strip fills in as a
 * single thing. `animate` is false for every render after the first read, which
 * is what makes a range switch swap the numbers rather than replay them.
 *
 * `stale` marks figures the reader is still looking at after the selection moved
 * on. They stay mounted and keep their own range's meaning — the strip is only
 * dimmed, never emptied, so a switch that takes a moment does not move the page.
 */
export function SummaryStrip({ report, animate, stale, onEntranceEnd, t, money, tokens, integer, percent }: SummaryStripProps): ReactNode {
  const { totals } = report
  const rangeTokens = report.days.reduce((sum, day) => sum + tokensOf(day), 0)
  const hitRate = cacheHitRate(totals)
  // One share for the whole strip rather than one clock per figure: eight
  // independent count-ups would read as eight things arriving, not one.
  const share = useEntrance(animate, onEntranceEnd)
  // Bucketed from the figure the entrance lands on, never from the value part-way
  // through it: a type size that changed as the digits grew would be a wobble of
  // its own, in the one place this panel is trying not to have one.
  const cost = money(totals.cost)
  return (
    <section
      className={css.summary}
      aria-label={t('rangeLabel')}
      aria-busy={stale}
      data-stale={stale}
    >
      <div className={css.hero}>
        <span className={css.heroLabel}>{t('totalCost')}</span>
        <span className={css.heroValue} data-room={figureRoom(cost)}>
          {money(totals.cost * share)}
        </span>
        {report.prices.some(card => card.peakEnabled) || report.fallbackPrice.peakEnabled
          ? <span className={css.heroDetail}>{t('peakNoteSeparate')}</span>
          : null}
      </div>
      <div className={css.tiles}>
        <Tile value={tokens(rangeTokens * share)} label={t('totalTokens')} />
        <Tile value={tokens(totals.uncachedInputTokens * share)} label={t('inputTokens')} />
        <Tile value={tokens(totals.outputTokens * share)} label={t('outputTokens')} />
        <Tile
          value={tokens(totals.cacheReadTokens * share)}
          label={t('cacheRead')}
          detail={`${t('cacheWrite')} ${tokens(totals.cacheWriteTokens * share)}`}
        />
        {/* A window with no prompt tokens has no rate; the dash says so rather
            than printing a zero the reader would compare against real rates. */}
        <Tile
          value={hitRate === undefined ? '—' : percent(hitRate * share)}
          label={t('cacheHitRate')}
          detail={t('cacheHitRateBasis')}
        />
        <Tile value={integer(totals.calls * share)} label={t('calls')} />
        <Tile value={integer(totals.sessions * share)} label={t('sessions')} />
      </div>
      {totals.calls === 0 ? <p className={css.empty}>{t('noUsage')}</p> : null}
    </section>
  )
}
