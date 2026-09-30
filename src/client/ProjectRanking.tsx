/**
 * Where a window's tokens went: one row per working directory, longest bar first.
 *
 * The calendar says when a profile spent; the summary says how much. Neither
 * answers *which project*, which is the question a day's figures raise the moment
 * they are read. This list closes the page under the calendar, answering it over
 * the same window as the summary above: the range selector switches both, so the
 * two can never describe different periods.
 *
 * Ten rows by default, because a profile with forty directories has a long tail
 * nobody reads, and the tail stays one click away rather than being dropped.
 *
 * @module dsh-local-usage/client/ProjectRanking
 */

import { useMemo, useState, type ReactNode } from 'react'
import type { UsageInsightsReport, UsageProjectRow } from '../types.ts'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { projectName } from './paths.ts'
import { barFraction, rankProjects } from './ranking.ts'
import { tokensOf } from './tokens.ts'
import { css } from './classes.ts'

/** Rows shown before the reader asks for the rest. */
export const DEFAULT_RANKING_LIMIT = 10

/** Props for the ranking. */
export interface ProjectRankingProps {
  /** The report these rows were folded from. */
  readonly report: UsageInsightsReport
  /** The range that report was folded for, stated so the list names its window. */
  readonly rangeLabel: string
  /**
   * Whether a fold for another range is under way behind this list.
   *
   * The rows stay mounted — a list that vanished for a round trip would move
   * everything under it — and their scope line stops naming the window the report
   * carries, so rows the reader has already moved on from cannot be read as
   * current.
   */
  readonly stale?: boolean
  /** Rows shown while collapsed. */
  readonly limit: number
  readonly t: PropsLocale<'usage'>['t']
  readonly formatCost: (value: number) => string
  readonly formatTokens: (value: number) => string
  readonly formatInteger: (value: number) => string
}

/**
 * Render the project ranking.
 * @param props - the range's report, its label, the row limit, and the formatters.
 * @returns the ranking section.
 */
export function ProjectRanking({
  report, rangeLabel, stale = false, limit, t, formatCost, formatTokens, formatInteger,
}: ProjectRankingProps): ReactNode {
  const [expanded, setExpanded] = useState(false)
  const ranked = useMemo(() => rankProjects(report.projects), [report.projects])
  const leader = ranked[0]
  const shown = expanded ? ranked : ranked.slice(0, limit)

  return (
    <section
      className={css.rank}
      aria-label={t('rankingTitle')}
      aria-busy={stale}
      data-stale={stale}
    >
      <header className={css.rankHead}>
        <h3 className={css.rankTitle}>{t('rankingTitle')}</h3>
        <p className={css.rankScope}>
          {stale
            ? t('updating')
            : t('rankingScope', { range: rangeLabel, count: formatInteger(ranked.length) })}
        </p>
      </header>

      {ranked.length === 0
        ? <p className={css.empty}>{t('rankingEmpty')}</p>
        : (
          <>
            {/* The column heads are the same grid as the rows, so a number's
                meaning is stated once instead of on every row. */}
            <div className={`${css.rankRow} ${css.rankRowHead}`} aria-hidden="true">
              <span className={css.rankPlace}>{t('rankingColumnRank')}</span>
              <span className={css.rankName}>{t('projectColumn')}</span>
              {/* The bar column is headless: an empty track up here would read
                  as a row with no data. */}
              <span />
              <span className={css.rankTokens}>{t('totalTokens')}</span>
              <span className={css.rankCost}>{t('cost')}</span>
              <span className={css.rankSessions}>{t('sessions')}</span>
            </div>
            <ol className={css.rankList}>
              {shown.map((row, index) => (
                <RankRow
                  key={row.path}
                  row={row}
                  place={index + 1}
                  fraction={barFraction(row, leader)}
                  t={t}
                  formatCost={formatCost}
                  formatTokens={formatTokens}
                  formatInteger={formatInteger}
                />
              ))}
            </ol>
            {ranked.length > limit
              ? (
                <button
                  type="button"
                  className={css.rankMore}
                  aria-expanded={expanded}
                  onClick={() => { setExpanded(value => !value) }}
                >
                  {expanded
                    ? t('rankingCollapse')
                    : t('rankingShowAll', { count: formatInteger(ranked.length) })}
                </button>
              )
              : null}
          </>
        )}
    </section>
  )
}

/** One ranked directory. */
function RankRow({ row, place, fraction, t, formatCost, formatTokens, formatInteger }: {
  readonly row: UsageProjectRow
  readonly place: number
  readonly fraction: number | undefined
  readonly t: PropsLocale<'usage'>['t']
  readonly formatCost: (value: number) => string
  readonly formatTokens: (value: number) => string
  readonly formatInteger: (value: number) => string
}): ReactNode {
  const name = projectName(row.path)
  return (
    <li className={css.rankRow}>
      <span className={css.rankPlace}>{String(place).padStart(2, '0')}</span>
      <span className={css.rankName}>
        <span className={css.rankNameText}>{name ?? t('projectUnknown')}</span>
        <code className={css.rankPath} title={row.path}>{name === undefined ? '' : row.path}</code>
      </span>
      <span className={css.rankBar}>
        <span
          className={css.rankBarFill}
          style={{ inlineSize: `${((fraction ?? 0) * 100).toFixed(1)}%` }}
        />
      </span>
      <span className={css.rankTokens}>{formatTokens(tokensOf(row))}</span>
      <span className={css.rankCost}>{formatCost(row.cost)}</span>
      <span className={css.rankSessions}>{formatInteger(row.sessions)}</span>
    </li>
  )
}
