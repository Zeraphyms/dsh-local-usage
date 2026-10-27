/**
 * The window's spend, listed by the route that billed it, the directory it
 * happened in, and the conversation it belonged to.
 *
 * The figure above answers what the window's shape was; these answer what it was
 * made of, and they answer it with numbers rather than with curves: a table can
 * be read exactly, compared down a column, and scanned for the one row that is
 * out of proportion, which is what a reader does with a model's, a project's or
 * a session's spend. All three are the same table, so all are drawn by the same
 * code; the session table's rows open the call log narrowed to that session.
 *
 * @module dsh-local-usage/client/StatsTables
 */

import type { ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageCosted, UsageInsightsReport, UsageSessionRow } from '../types.ts'
import { projectName } from './paths.ts'
import { tokensOf } from './tokens.ts'
import { UNKNOWN_PROJECT } from '../types.ts'
import { css } from './classes.ts'

/**
 * Rows a table lists before the reader has seen enough.
 *
 * A profile can carry dozens of routes; the ones worth reading are the ones at
 * the top of a list already sorted by cost, and the count beneath says how many
 * were left out so the table never claims to be the whole window.
 */
const ROWS = 8

/** One row of any table, already reduced to what the columns read. */
interface StatsRow {
  /** Stable key: a route, a directory, or a session id. */
  readonly key: string
  /** What the first column names. */
  readonly name: string
  /** The full path, when the name is a shortened one. */
  readonly detail?: string
  /** Whether this row was billed at the fallback rate. */
  readonly unpriced?: boolean
  readonly figures: UsageCosted
  /** Extra count in the last column: calls for a route, sessions for a directory, calls for a session. */
  readonly count: number
}

/** Props for the tables. */
export interface StatsTablesProps {
  /** The report for the range the reader selected. */
  readonly report: UsageInsightsReport
  readonly t: PropsLocale<'usage'>['t']
  readonly formatCost: (value: number) => string
  readonly formatInteger: (value: number) => string
  /** Open the call log narrowed to one session, when a session row is clicked. */
  readonly onOpenCalls?: (sessionId: string) => void
}

/**
 * Render the window's spend by model, by project and by session.
 * @param props - the report, the formatters, and the session drill-down.
 * @returns the three tables.
 */
export function StatsTables({ report, t, formatCost, formatInteger, onOpenCalls }: StatsTablesProps): ReactNode {
  const models: StatsRow[] = report.models.slice(0, ROWS).map(row => ({
    key: row.route,
    name: row.route,
    unpriced: !row.priced,
    figures: row,
    count: row.calls,
  }))
  const projects: StatsRow[] = report.projects.slice(0, ROWS).map(row => {
    // A row is either a directory or the bucket of sessions whose header named
    // none; only the first has a name to shorten.
    const name = projectName(row.path)
    return {
      key: row.path,
      name: name ?? t('projectUnknown'),
      ...name === undefined ? {} : { detail: row.path },
      figures: row,
      count: row.sessions,
    }
  })
  const sessions: StatsRow[] = report.sessions.slice(0, ROWS).map(row => sessionRowOf(row, t))

  return (
    <div className={css.statsBlock}>
      <StatsTable
        heading={t('statsByModel')}
        nameColumn={t('routeColumn')}
        countColumn={t('calls')}
        rows={models}
        total={report.models.length}
        t={t}
        formatCost={formatCost}
        formatInteger={formatInteger}
      />
      <StatsTable
        heading={t('statsByProject')}
        nameColumn={t('projectColumn')}
        countColumn={t('sessions')}
        rows={projects}
        total={report.projects.length}
        t={t}
        formatCost={formatCost}
        formatInteger={formatInteger}
      />
      <StatsTable
        heading={t('statsBySession')}
        nameColumn={t('sessionColumn')}
        countColumn={t('calls')}
        rows={sessions}
        total={report.sessions.length}
        t={t}
        formatCost={formatCost}
        formatInteger={formatInteger}
        {...onOpenCalls === undefined ? {} : { onOpen: onOpenCalls }}
      />
    </div>
  )
}

/** One session table row: named by its title, identified by its id and directory. */
function sessionRowOf(row: UsageSessionRow, t: PropsLocale<'usage'>['t']): StatsRow {
  return {
    key: row.sessionId,
    name: row.title ?? t('sessionUntitled'),
    detail: row.cwd === undefined ? row.sessionId : `${row.cwd} · ${row.sessionId}`,
    figures: row,
    count: row.calls,
  }
}

/** One of the three tables: a heading, four columns, and what it left out. */
function StatsTable({ heading, nameColumn, countColumn, rows, total, t, formatCost, formatInteger, onOpen }: {
  readonly heading: string
  readonly nameColumn: string
  readonly countColumn: string
  readonly rows: readonly StatsRow[]
  /** How many rows the report carried, so a truncated table can say so. */
  readonly total: number
  readonly t: PropsLocale<'usage'>['t']
  readonly formatCost: (value: number) => string
  readonly formatInteger: (value: number) => string
  /** Open the call log narrowed to this row, when the table drills down. */
  readonly onOpen?: (key: string) => void
}): ReactNode {
  return (
    <section className={css.tableBlock}>
      <h3 className={css.tableHeading}>{heading}</h3>
      {rows.length === 0
        ? <p className={css.empty}>{t('noUsage')}</p>
        : (
          <table className={`${css.projectTable} ${css.statsTable}`}>
            <caption className={css.visuallyHidden}>{heading}</caption>
            <colgroup>
              <col className={css.statsColName} />
              <col className={css.statsColTokens} />
              <col className={css.statsColCost} />
              <col className={css.statsColCount} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">{nameColumn}</th>
                <th scope="col" className={css.numeric}>{t('totalTokens')}</th>
                <th scope="col" className={css.numeric}>{t('cost')}</th>
                <th scope="col" className={css.numeric}>{countColumn}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.key}
                  {...onOpen === undefined ? {} : {
                    className: css.statsRowLink,
                    onClick: () => { onOpen(row.key) },
                  }}
                >
                  <th scope="row" className={css.projectCell}>
                    <span
                      className={css.projectName}
                      title={row.name === UNKNOWN_PROJECT ? undefined : row.name}
                    >
                      {row.name}
                    </span>
                    {row.detail === undefined ? null : <code className={css.projectPath}>{row.detail}</code>}
                    {row.unpriced === true
                      ? <span className={css.unpricedBadge}>{t('pricingFallback')}</span>
                      : null}
                  </th>
                  <td className={css.numeric}>{formatInteger(tokensOf(row.figures))}</td>
                  <td className={css.numeric}>{formatCost(row.figures.cost)}</td>
                  <td className={css.numeric}>{formatInteger(row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      {total > rows.length
        ? <p className={css.tableNote}>{t('statsMore', {
          shown: formatInteger(rows.length),
          total: formatInteger(total),
        })}
        </p>
        : null}
    </section>
  )
}
