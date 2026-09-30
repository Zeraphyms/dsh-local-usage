/**
 * The page drawn before the page: the panel's own frame, standing in while the
 * first read runs.
 *
 * The first request after a restart decodes every durable session log, which on a
 * real corpus is seconds. What the reader used to get was one line of text and
 * then a whole layout appearing at once; what they get here is the layout itself,
 * empty — the same hero and tiles, the same year of cells at the same measured
 * edge, the same ranking rows — so nothing moves when the figures land.
 *
 * Only what genuinely cannot be known yet is a placeholder. The month labels, the
 * weekday gutter and the size of every cell are facts about the calendar, not
 * about the usage, so they are drawn for real; only the figures are ghosts. That
 * is also what keeps this honest: the frame is not decoration, it is the part of
 * the answer that arrived immediately.
 *
 * When the Host reports how many logs it has to fold, that count is stated with a
 * determinate bar. When it cannot, the bar sweeps instead — motion standing in for
 * time nobody can measure, in the one place it says something true.
 *
 * @module dsh-local-usage/client/PanelSkeleton
 */

import { useMemo, type ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageInsightsProgress } from '../types.ts'
import { heatmapColumns, heatmapWindow, monthMarkers, midnight } from './heatmap-grid.ts'
import { CELL_GAP, LABEL_WIDTH, useResponsiveGrid } from './heatmap-measure.ts'
import { css } from './classes.ts'

const MS_PER_DAY = 86_400_000
const WEEKDAY_ROWS = 7

/** Compact weekday gutter labels, matching the `wdShort.*` keys the calendar uses. */
const WEEKDAY_SHORT_KEYS = ['wdShort.0', 'wdShort.1', 'wdShort.2', 'wdShort.3', 'wdShort.4', 'wdShort.5', 'wdShort.6'] as const

/** Tiles the summary strip carries. */
const TILE_COUNT = 7

/** Project rows drawn before the day's table arrives. */
const PROJECT_ROWS = 4

/**
 * The hero figure's frame: a label line, the value line, and the line the peak
 * note occupies when there is one.
 *
 * The third line is drawn because the real hero almost always has one — the
 * shipped rate card carries a peak multiplier — and a frame that omits it is a
 * frame the panel settles out of when the figures land.
 *
 * @returns the hero's placeholder.
 */
export function HeroSkeleton(): ReactNode {
  return (
    <div className={css.hero} aria-hidden="true">
      <span className={css.skelLine} data-width="short" />
      <span className={css.skelLine} data-width="hero" />
      <span className={css.skelLine} data-width="detail" />
    </div>
  )
}

/**
 * The tiles row's frame, at the same track sizing the real one uses.
 * @returns the tiles' placeholder.
 */
export function TilesSkeleton(): ReactNode {
  return (
    <div className={css.tiles} aria-hidden="true">
      {Array.from({ length: TILE_COUNT }, (_, index) => (
        <div key={index} className={css.tile}>
          <span className={css.skelLine} data-width="value" />
          <span className={css.skelLine} data-width="label" />
        </div>
      ))}
    </div>
  )
}

/**
 * The summary strip's frame, without its figures.
 *
 * Exported because it stands in twice: for the whole panel while the year is
 * being read, and for the strip alone on the first fold of a range — the moment
 * between the calendar arriving and its figures doing so. Both need the same
 * geometry, or the page settles twice.
 *
 * @returns the strip's placeholder.
 */
export function SummarySkeleton(): ReactNode {
  return (
    <section className={css.summary} aria-hidden="true">
      <HeroSkeleton />
      <TilesSkeleton />
    </section>
  )
}

/**
 * The day page's per-directory table, before it has any rows.
 *
 * A real table with real cells: the columns are sized by the same rules as the
 * rows that replace them, so a slow day fold fills the frame instead of resizing
 * it. The heading keeps its own box for the same reason.
 *
 * @returns the table's placeholder.
 */
export function ProjectsSkeleton(): ReactNode {
  return (
    <div className={css.projectBlock} aria-hidden="true">
      <h3 className={css.projectHeading}>
        <span className={css.skelLine} data-width="heading" />
      </h3>
      <table className={css.projectTable}>
        <thead>
          <tr>
            <th scope="col" />
            {Array.from({ length: 5 }, (_, index) => (
              <th key={index} scope="col" className={css.numeric} />
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: PROJECT_ROWS }, (_, row) => (
            <tr key={row}>
              <th scope="row" className={css.projectCell}>
                <span className={css.skelLine} data-width="name" />
              </th>
              {Array.from({ length: 5 }, (_, column) => (
                <td key={column} className={css.numeric}>
                  <span className={css.skelLine} data-width="cell" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Ranking rows drawn before the list arrives; the collapsed list shows ten. */
const RANK_ROWS = 10

/** Props for the loading frame. */
export interface PanelSkeletonProps {
  /** The read's published progress, or `undefined` while none has been reported. */
  readonly progress: UsageInsightsProgress | undefined
  /** Week columns the calendar spans. */
  readonly weeks: number
  readonly t: PropsLocale<'usage'>['t']
}

/**
 * The sentence and bar describing the read.
 *
 * A read that has not stated a size gets the sweeping bar and no count: printing
 * "0 / 0" would state a fact about nothing, and a bar pinned at zero would say the
 * work had stopped.
 */
function ReadProgressLine({ progress, t }: {
  readonly progress: UsageInsightsProgress | undefined
  readonly t: PropsLocale<'usage'>['t']
}): ReactNode {
  const total = progress?.total ?? 0
  const done = progress?.done ?? 0
  const measured = total > 0
  const sentence = progress?.phase === 'reading' && measured
    ? t('loadingReading', { done: String(done), total: String(total) })
    : progress?.phase === 'listing' ? t('loadingListing')
      : progress?.phase === 'pricing' ? t('loadingPricing')
        : t('loading')
  return (
    <div className={css.loading}>
      <p className={css.loadingText}>{sentence}</p>
      <div
        className={css.loadingTrack}
        data-measured={measured}
        role="progressbar"
        aria-label={sentence}
        {...measured
          ? { 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': done }
          : {}}
      >
        <div
          className={css.loadingFill}
          style={measured ? { inlineSize: `${String(Math.round((done / total) * 100))}%` } : undefined}
        />
      </div>
    </div>
  )
}

/**
 * Render the loading frame.
 * @param props - the read's progress, the calendar window, and the dictionary.
 * @returns the frame the real panel replaces.
 */
export function PanelSkeleton({ progress, weeks, t }: PanelSkeletonProps): ReactNode {
  const now = useMemo(() => Date.now(), [])
  const [from, to] = useMemo(() => heatmapWindow(now, weeks), [now, weeks])
  const first = midnight(from)
  const last = midnight(to)
  const totalColumns = heatmapColumns(first, last)
  const { containerRef, cellSize, columns } = useResponsiveGrid(totalColumns)
  const visibleStart = first + (totalColumns - columns) * WEEKDAY_ROWS * MS_PER_DAY
  const markers = useMemo(
    () => monthMarkers(visibleStart, last, columns)
      .map(marker => ({ ...marker, label: t('monthLabel', { n: String(marker.month) }) })),
    [columns, last, t, visibleStart],
  )
  const trackTemplate = `${String(LABEL_WIDTH)}px repeat(${String(columns)}, ${String(cellSize)}px)`

  // The days the ghost grid stands for: every position up to today, the same
  // walk the real grid makes, so the two grids end on the same column.
  const ghosts = useMemo(() => {
    const cells: { readonly key: string; readonly column: number; readonly row: number }[] = []
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < WEEKDAY_ROWS; row += 1) {
        const time = visibleStart + (column * WEEKDAY_ROWS + row) * MS_PER_DAY
        if (time > last) continue
        cells.push({ key: `${String(column)}-${String(row)}`, column, row })
      }
    }
    return cells
  }, [columns, last, visibleStart])

  return (
    <>
      <ReadProgressLine progress={progress} t={t} />

      <SummarySkeleton />

      <figure className={css.calendar} aria-hidden="true">
        <figcaption className={css.calendarCaption}>
          <div className={css.calendarHeading}>
            <span className={css.calendarTitle}>{t('calendar')}</span>
            <span className={css.calendarYear}>{t('calendarWindow')}</span>
          </div>
          <span className={css.skelLine} data-width="total" />
        </figcaption>
        <div className={css.calendarScroll}>
          <div ref={containerRef} className={css.calendarMeasure}>
            <div className={css.monthRow} style={{ gridTemplateColumns: trackTemplate, columnGap: CELL_GAP }}>
              <span />
              {markers.map(marker => (
                <span
                  key={marker.key}
                  className={css.monthLabel}
                  style={{ gridColumnStart: marker.index + 2 }}
                >
                  {marker.label}
                </span>
              ))}
            </div>
            <div className={css.gridRow} style={{ gridTemplateColumns: trackTemplate, columnGap: CELL_GAP }}>
              <div
                className={css.weekdayColumn}
                style={{ gridTemplateRows: `repeat(${String(WEEKDAY_ROWS)}, ${String(cellSize)}px)`, rowGap: CELL_GAP }}
              >
                {WEEKDAY_SHORT_KEYS.map(key => <span key={key} className={css.weekday}>{t(key)}</span>)}
              </div>
              <div
                className={css.cells}
                style={{
                  gridColumn: '2 / -1',
                  gridTemplateRows: `repeat(${String(WEEKDAY_ROWS)}, ${String(cellSize)}px)`,
                  gridTemplateColumns: `repeat(${String(columns)}, ${String(cellSize)}px)`,
                  gap: CELL_GAP,
                }}
              >
                {ghosts.map(cell => (
                  <span
                    key={cell.key}
                    className={css.cellGhost}
                    style={{
                      gridRowStart: cell.row + 1,
                      gridColumnStart: cell.column + 1,
                      inlineSize: cellSize,
                      blockSize: cellSize,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </figure>

      <section className={css.rank} aria-hidden="true">
        <header className={css.rankHead}>
          <span className={css.skelLine} data-width="heading" />
          <span className={css.skelLine} data-width="scope" />
        </header>
        <div className={`${css.rankRow} ${css.rankRowHead}`}>
          <span className={css.rankPlace} />
          <span className={css.rankName} />
          <span />
          <span className={css.rankTokens} />
          <span className={css.rankCost} />
          <span className={css.rankSessions} />
        </div>
        <div className={css.rankList}>
          {Array.from({ length: RANK_ROWS }, (_, index) => (
            <div key={index} className={css.rankRow}>
              <span className={css.rankPlace} />
              <span className={css.rankName}>
                <span className={css.skelLine} data-width="name" />
                {/* The real row carries a path under its name, and two lines is
                    most of what gives the list its height. */}
                <span className={css.skelLine} data-width="path" />
              </span>
              <span className={css.rankBar}>
                <span className={css.skelBar} style={{ inlineSize: `${String(barWidth(index))}%` }} />
              </span>
              <span className={css.rankTokens} />
              <span className={css.rankCost} />
              <span className={css.rankSessions} />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

/**
 * Bar length for one ghost row.
 *
 * Descending and irregular rather than uniform: a stack of identical bars reads
 * as a table of nothing, while the shape the list actually has is the one thing
 * about it that can be drawn before the list arrives.
 *
 * @param index - zero-based row.
 * @returns the fill width as a percentage of the track.
 */
function barWidth(index: number): number {
  return [94, 71, 58, 44, 36, 29, 23, 18, 13, 9][index] ?? 9
}
