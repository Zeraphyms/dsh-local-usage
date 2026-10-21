/**
 * The year in usage: one cell per day, shaded by what that day cost.
 *
 * There is no charting library in this product and adding one is out of bounds,
 * so the calendar is a CSS grid of fixed-size cells — never fractional tracks,
 * because a cell whose box depends on its track width has no stable intrinsic
 * size to lay out against. A ResizeObserver measures the panel instead: while a
 * year of weeks fits at the minimum cell edge the cells grow to fill it, and
 * below that the grid keeps the minimum edge and drops its oldest weeks. Either
 * way the grid never scrolls sideways.
 *
 * Shading is a quantile ramp over the window's active days (median, then 75th
 * and 90th percentiles), so the scale adapts to how the profile actually spends
 * instead of assuming a distribution.
 *
 * Every cell is a button that opens that day's own page, so the calendar is a
 * way in rather than only a picture of the year. The grid is one tab stop: the
 * arrow keys walk it, Home and End jump within a week, and focus is tracked by
 * (column, row) rather than by DOM offset because the last column stops at
 * today and a plain index would run off its end.
 *
 * @module dsh-local-usage/client/CalendarHeatmap
 */

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsageDayRow } from '../types.ts'
import { WEEKDAY_KEYS, addDays, dayDiff, dayKey, dayTime, heatmapColumns, midnight, monthMarkers } from './heatmap-grid.ts'
import { CELL_GAP, LABEL_WIDTH, useResponsiveGrid } from './heatmap-measure.ts'
import { shadeLevel, shadeLevels, tokensOf } from './heatmap-shade.ts'
import type { ShadeLevels } from './heatmap-shade.ts'
import { css } from './classes.ts'
import { CalendarTooltip } from './CalendarTooltip.tsx'
import type { Hover } from './CalendarTooltip.tsx'

const WEEKDAY_ROWS = 7
/** Tooltip clamp so a card on an edge column stays on screen. */
const TOOLTIP_HALF_WIDTH = 150
/** Approximate card height; below this viewport offset the card flips under the cell. */
const TOOLTIP_FLIP_ABOVE = 320

/** Compact row gutter labels, matching the `wdShort.*` dictionary keys. */
const WEEKDAY_SHORT_KEYS = ['wdShort.0', 'wdShort.1', 'wdShort.2', 'wdShort.3', 'wdShort.4', 'wdShort.5', 'wdShort.6'] as const

/** One day of the grid: the report row, or `undefined` for a day with no usage. */
type HeatCell = { readonly day: string; readonly row: UsageDayRow | undefined }

/** Everything the calendar renders, resolved by the panel that owns the data. */
export interface CalendarHeatmapProps {
  /** First day of the window, Unix epoch milliseconds; a Sunday by construction. */
  readonly from: number
  /** Last rendered day inclusive, normally today. */
  readonly to: number
  /** First instant of the selected range, for the band the figures describe. */
  readonly rangeFrom: number
  /** Last instant of the selected range. */
  readonly rangeTo: number
  /** Day rows in the window, ascending; days with no usage are simply absent. */
  readonly days: readonly UsageDayRow[]
  /** Cost over the whole window. */
  readonly totalCost: number
  /** The most expensive day in the window, when it has any usage. */
  readonly peak: UsageDayRow | undefined
  /** Panel translate function. */
  readonly t: PropsLocale<'usage'>['t']
  /** Currency formatter owned by the panel. */
  readonly formatCost: (value: number) => string
  /** Full integer formatter: every figure the calendar shows is a drill-down one. */
  readonly formatInteger: (value: number) => string
  /** Localized date formatter, for a day key rendered to a reader. */
  readonly formatDay: (day: string) => string
  /** Open one day's own page. */
  readonly onSelectDay: (day: string) => void
  /**
   * Day the grid should focus when it mounts.
   *
   * Set only when the reader is coming back from a day page, so the return trip
   * puts them on the cell they left from. Left undefined on first mount, when
   * stealing focus would be an interruption rather than a restoration.
   */
  readonly focusDayOnMount?: string
}

/** Everything the year of cells draws from. */
interface CalendarCellsProps {
  /** Visible columns, oldest first; `null` is a position past today. */
  readonly grid: readonly (readonly (HeatCell | null)[])[]
  /** First day of the selected range, or undefined when it covers the window. */
  readonly rangeStart: string | undefined
  /** Last day of the selected range, or undefined when it covers the window. */
  readonly rangeEnd: string | undefined
  /** Cell edge in pixels; the band's outline is drawn against it. */
  readonly cellSize: number
  /** Shading thresholds. */
  readonly levels: ShadeLevels
  /** The one cell held in the tab order. */
  readonly focusDay: string
  /** Panel translate function. */
  readonly t: PropsLocale<'usage'>['t']
  /** Currency formatter owned by the panel. */
  readonly formatCost: (value: number) => string
  /** Full integer formatter. */
  readonly formatInteger: (value: number) => string
  /** Localized date formatter. */
  readonly formatDay: (day: string) => string
  /** The grid element, which focus and keyboard moves are resolved against. */
  readonly cellsRef: RefObject<HTMLDivElement>
  readonly onSelectDay: (day: string) => void
  readonly onEnter: (cell: HeatCell, row: number, level: number, target: HTMLButtonElement) => void
  readonly onLeave: () => void
  readonly onFocusCell: (day: string) => void
  readonly onKey: (event: KeyboardEvent<HTMLButtonElement>, column: number, row: number) => void
}

/**
 * The year of cells, memoized apart from the figure around it.
 *
 * It is the expensive half of a render and the card above it is not: a year of
 * columns is 364 buttons, each labelling itself from four formatted figures,
 * while the hover card is one small box pinned to whichever cell the pointer is
 * over. Hover is parent state, so without this boundary every pointer move
 * across the grid would rebuild all 364 labels to move that one box.
 */
const CalendarCells = memo(function CalendarCells({
  grid, cellSize, levels, focusDay, t, rangeStart, rangeEnd,
  formatCost, formatInteger, formatDay, cellsRef,
  onSelectDay, onEnter, onLeave, onFocusCell, onKey,
}: CalendarCellsProps): ReactNode {
  // The selected range drawn as one ribbon: a frame around the band rather than a
  // ring on every day, which read as a second grid laid over the first. The band
  // runs down each week it touches and steps sideways where the range starts or
  // ends, so its outline is the shape of the days themselves.
  const band = useMemo(() => {
    if (rangeStart === undefined || rangeEnd === undefined) return undefined
    const firstDay = grid[0]?.[0]?.day
    const start = dayTime(rangeStart)
    const end = dayTime(rangeEnd)
    const origin = firstDay === undefined ? undefined : dayTime(firstDay)
    if (start === undefined || end === undefined || origin === undefined) return undefined
    // A week trimmed off the left of a narrow panel means the range opens before
    // the grid: the band then starts at the first visible Sunday.
    const lastIndex = grid.length * WEEKDAY_ROWS - 1
    const startIndex = Math.max(0, dayDiff(origin, start))
    const endIndex = Math.min(lastIndex, dayDiff(origin, end))
    if (endIndex < 0 || startIndex > lastIndex) return undefined

    const pitch = cellSize + CELL_GAP
    // Half a gap of margin: adjacent days' frames would otherwise part at every
    // cell edge, and the stroke would trace each square separately.
    const margin = 2
    const left = (column: number): number => column * pitch - margin
    const right = (column: number): number => column * pitch + cellSize + margin
    const top = (row: number): number => row * pitch - margin
    const bottom = (row: number): number => row * pitch + cellSize + margin

    const startColumn = Math.floor(startIndex / WEEKDAY_ROWS)
    const startRow = startIndex % WEEKDAY_ROWS
    const endColumn = Math.floor(endIndex / WEEKDAY_ROWS)
    const endRow = endIndex % WEEKDAY_ROWS
    const path = startColumn === endColumn
      ? `M ${String(left(startColumn))} ${String(top(startRow))} H ${String(right(endColumn))} `
        + `V ${String(bottom(endRow))} H ${String(left(startColumn))} Z`
      // More than one week: the frame follows the first week down to its last
      // day, then the full weeks, then the last week down to the range's end.
      : `M ${String(left(startColumn))} ${String(top(startRow))} H ${String(left(startColumn + 1))} `
        + `V ${String(top(0))} H ${String(right(endColumn))} V ${String(bottom(endRow))} `
        + `H ${String(left(endColumn))} V ${String(bottom(WEEKDAY_ROWS - 1))} H ${String(left(startColumn))} Z`
    return {
      path,
      width: grid.length * pitch - CELL_GAP,
      height: WEEKDAY_ROWS * pitch - CELL_GAP,
    }
  }, [cellSize, grid, rangeEnd, rangeStart])

  return (
    <div
      ref={cellsRef}
      className={css.cells}
      role="grid"
      aria-label={t('calendar')}
      data-range={rangeStart === undefined ? undefined : 'true'}
      style={{
        // Spans the whole track list: a grid item placed in the single label
        // column would overflow its own track list to the right.
        gridColumn: '2 / -1',
        gridTemplateRows: `repeat(${String(WEEKDAY_ROWS)}, ${String(cellSize)}px)`,
        // `display: contents` on each row means the rows are not grid items, so
        // the columns are declared here over every rendered week.
        gridTemplateColumns: `repeat(${String(grid.length)}, ${String(cellSize)}px)`,
        gap: CELL_GAP,
      }}
    >
      {band === undefined ? null : (
        <svg className={css.rangeBand} width={band.width} height={band.height} aria-hidden="true">
          <path d={band.path} />
        </svg>
      )}
      {/* Row-major with every cell placed explicitly. A real grid row per weekday
       * is what gives each cell a `row` owner in the accessibility tree, and
       * positional focus needs a position to move from. The wrapper draws no box
       * of its own. */}
      {Array.from({ length: WEEKDAY_ROWS }, (_, row) => (
        <div key={row} className={css.cellRow} role="row">
          {grid.map((week, column) => {
            const cell = week[row]
            if (cell === undefined || cell === null) return null
            const tokens = cell.row === undefined ? 0 : tokensOf(cell.row)
            const level = shadeLevel(tokens, levels)
            // The grid opens on a Sunday and fills one row per weekday, so the
            // row index *is* the weekday.
            const label = t('dayLabel', {
              day: formatDay(cell.day),
              weekday: t(WEEKDAY_KEYS[row] ?? 'wd.0'),
              cost: formatCost(cell.row?.cost ?? 0),
              tokens: formatInteger(tokens),
              calls: formatInteger(cell.row?.calls ?? 0),
            })
            return (
              <button
                key={cell.day}
                type="button"
                className={css.cell}
                data-level={level}
                data-day={cell.day}
                data-in-range={rangeStart === undefined || rangeEnd === undefined
                  ? undefined
                  : cell.day >= rangeStart && cell.day <= rangeEnd ? 'true' : 'false'}
                role="gridcell"
                aria-label={label}
                tabIndex={cell.day === focusDay ? 0 : -1}
                style={{
                  gridRowStart: row + 1,
                  gridColumnStart: column + 1,
                  inlineSize: cellSize,
                  blockSize: cellSize,
                }}
                onFocus={() => { onFocusCell(cell.day) }}
                onKeyDown={(event) => { onKey(event, column, row) }}
                onClick={() => { onSelectDay(cell.day) }}
                onMouseEnter={(event) => { onEnter(cell, row, level, event.currentTarget) }}
                onMouseLeave={onLeave}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
})

/**
 * Render the calendar grid plus its legend and hover card.
 * @param props - the window, its day rows, the selected range, formatters, and copy.
 * @returns the calendar figure.
 */
export function CalendarHeatmap({
  from, to, rangeFrom, rangeTo, days, totalCost, peak, t,
  formatCost, formatInteger, formatDay, onSelectDay, focusDayOnMount,
}: CalendarHeatmapProps): ReactNode {
  const [hover, setHover] = useState<Hover | undefined>(undefined)

  const first = midnight(from)
  const last = midnight(to)
  const totalColumns = heatmapColumns(first, last)
  // The band the figures were folded over. A range that spans the whole window
  // marks nothing: every day is in it, and dimming none of them is the statement.
  const rangeStart = dayKey(rangeFrom)
  const rangeEnd = dayKey(rangeTo)
  const narrowed = rangeStart > dayKey(from) || rangeEnd < dayKey(to)

  const byDay = useMemo(() => new Map(days.map(row => [row.day, row])), [days])
  const grid = useMemo(() => {
    const columns: (HeatCell | null)[][] = []
    for (let column = 0; column < totalColumns; column += 1) {
      const week: (HeatCell | null)[] = []
      for (let row = 0; row < WEEKDAY_ROWS; row += 1) {
        const time = addDays(first, column * WEEKDAY_ROWS + row)
        if (time > last) {
          week.push(null)
          continue
        }
        const day = dayKey(time)
        week.push({ day, row: byDay.get(day) })
      }
      columns.push(week)
    }
    return columns
  }, [byDay, first, last, totalColumns])

  // Quantile thresholds over the window's active days: a scale that adapts to
  // how this profile spends rather than assuming a distribution.
  const levels = useMemo(() => shadeLevels(days), [days])

  const { containerRef, cellSize, columns: visibleColumns } = useResponsiveGrid(totalColumns)
  // Held by identity, not recomputed per render: it is a prop of the memoized
  // cells, so a fresh array here would re-render the whole year on every change
  // of the hover card.
  const visible = useMemo(() => grid.slice(-visibleColumns), [grid, visibleColumns])
  // `first` is a Sunday, so dropping whole leading weeks keeps every remaining
  // column week-aligned; positions and markers both read from this start.
  const visibleStart = addDays(first, (totalColumns - visibleColumns) * WEEKDAY_ROWS)

  // Roving focus: the grid is a single tab stop and the arrow keys move within
  // it, so exactly one cell is tabbable at a time. Navigation is expressed as
  // (column, row) rather than as a DOM offset because the last column stops at
  // today — an offset walk would step off its end into nothing.
  const [focusCell, setFocusCell] = useState<string | undefined>(focusDayOnMount)
  const cellsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (focusDayOnMount === undefined) return
    cellsRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDayOnMount}"]`)?.focus()
  }, [focusDayOnMount])

  const renderedDays = useMemo(() => {
    const present = new Set<string>()
    for (const week of visible) {
      for (const cell of week) if (cell !== null) present.add(cell.day)
    }
    return present
  }, [visible])

  // Today ends the grid, so it is always a rendered cell and always a valid
  // fallback for a focus target the grid no longer holds.
  const focusDay = focusCell !== undefined && renderedDays.has(focusCell) ? focusCell : dayKey(last)

  /**
   * The rendered day at one grid position.
   *
   * A short column is short at the *bottom* — the grid fills forward from its
   * opening Sunday and stops at today — so a position past the end resolves to
   * the nearest cell above it. That one rule gives the arrow keys their
   * boundary behaviour on both axes: stepping down out of a short column stays
   * put, and stepping right into one lands on its last day.
   */
  const dayAt = useCallback((column: number, row: number): string | undefined => {
    const week = visible[column]
    if (week === undefined) return undefined
    for (let offset = 0; offset < WEEKDAY_ROWS; offset += 1) {
      const probe = week[row - offset]
      if (probe !== undefined && probe !== null) return probe.day
    }
    return undefined
  }, [visible])

  /** Move the roving focus, and take real focus with it so the two cannot disagree. */
  const onKey = useCallback((event: KeyboardEvent<HTMLButtonElement>, column: number, row: number): void => {
    const target = event.key === 'ArrowLeft' ? dayAt(column - 1, row)
      : event.key === 'ArrowRight' ? dayAt(column + 1, row)
      : event.key === 'ArrowUp' ? dayAt(column, row - 1)
      : event.key === 'ArrowDown' ? dayAt(column, row + 1)
      : event.key === 'Home' ? dayAt(column, 0)
      : event.key === 'End' ? dayAt(column, WEEKDAY_ROWS - 1)
      : undefined
    if (target === undefined) return
    event.preventDefault()
    setFocusCell(target)
    // Focused here rather than in an effect: the tabIndex flip alone only takes
    // effect on the next Tab press, which is not where the reader is looking.
    cellsRef.current?.querySelector<HTMLButtonElement>(`[data-day="${target}"]`)?.focus()
  }, [dayAt])

  // Stable so the memoized cells keep their identity: these are the callbacks the
  // grid hands back, and the only state they touch is the hover card and the
  // roving tab stop — neither of which the cells themselves draw.
  const onEnter = useCallback(
    (cell: HeatCell, row: number, level: number, target: HTMLButtonElement): void => {
      const rect = target.getBoundingClientRect()
      setHover({
        key: cell.day,
        weekday: row,
        row: cell.row,
        level,
        x: Math.min(
          Math.max(rect.left + rect.width / 2, TOOLTIP_HALF_WIDTH),
          window.innerWidth - TOOLTIP_HALF_WIDTH,
        ),
        y: rect.top,
        placement: rect.top < TOOLTIP_FLIP_ABOVE ? 'below' : 'above',
      })
    },
    [],
  )
  const onLeave = useCallback((): void => { setHover(undefined) }, [])
  const onFocusCell = useCallback((day: string): void => { setFocusCell(day) }, [])

  const markers = useMemo(
    () => monthMarkers(visibleStart, last, visibleColumns)
      .map(marker => ({ ...marker, label: t('monthLabel', { n: String(marker.month) }) })),
    [last, t, visibleColumns, visibleStart],
  )

  const trackTemplate = `${String(LABEL_WIDTH)}px repeat(${String(visibleColumns)}, ${String(cellSize)}px)`

  return (
    <figure className={css.calendar}>
      <figcaption className={css.calendarCaption}>
        <div className={css.calendarHeading}>
          <span className={css.calendarTitle}>{t('calendar')}</span>
          <span className={css.calendarYear}>{t('calendarWindow')}</span>
          {narrowed
            ? (
              <span className={css.calendarRange}>
                {rangeStart === rangeEnd
                  ? t('calendarRangeSelectedDay', { day: formatDay(rangeStart) })
                  : t('calendarRangeSelected', { from: formatDay(rangeStart), to: formatDay(rangeEnd) })}
              </span>
            )
            : null}
        </div>
        <span className={css.calendarTotal}>{formatCost(totalCost)}</span>
      </figcaption>
      <div className={css.calendarScroll} onMouseLeave={() => { setHover(undefined) }}>
        <div ref={containerRef} className={css.calendarMeasure}>
          <div className={css.monthRow} style={{ gridTemplateColumns: trackTemplate, columnGap: CELL_GAP }}>
            <span />
            {markers.map(marker => (
              <span
                key={marker.key}
                className={css.monthLabel}
                aria-hidden="true"
                style={{ gridColumnStart: marker.index + 2 }}
              >
                {marker.label}
              </span>
            ))}
          </div>
          <div className={css.gridRow} style={{ gridTemplateColumns: trackTemplate, columnGap: CELL_GAP }}>
            <div
              className={css.weekdayColumn}
              aria-hidden="true"
              style={{ gridTemplateRows: `repeat(${String(WEEKDAY_ROWS)}, ${String(cellSize)}px)`, rowGap: CELL_GAP }}
            >
              {WEEKDAY_SHORT_KEYS.map(key => <span key={key} className={css.weekday}>{t(key)}</span>)}
            </div>
            <CalendarCells
              grid={visible}
              cellSize={cellSize}
              levels={levels}
              focusDay={focusDay}
              rangeStart={narrowed ? rangeStart : undefined}
              rangeEnd={narrowed ? rangeEnd : undefined}
              t={t}
              formatCost={formatCost}
              formatInteger={formatInteger}
              formatDay={formatDay}
              cellsRef={cellsRef}
              onSelectDay={onSelectDay}
              onEnter={onEnter}
              onLeave={onLeave}
              onFocusCell={onFocusCell}
              onKey={onKey}
            />
          </div>
        </div>
      </div>
      <div className={css.legend}>
        <span className={css.legendHint}>{t('calendarHint')}</span>
        <span className={css.legendScale} aria-label={t('calendar')}>
          <span className={css.legendLabel}>{t('legendLess')}</span>
          {[0, 1, 2, 3, 4].map(level => (
            <span key={level} className={css.legendSwatch} data-level={level} />
          ))}
          <span className={css.legendLabel}>{t('legendMore')}</span>
        </span>
        {peak === undefined ? null : (
          <span className={css.legendPeak}>
            {t('peakDay', { day: formatDay(peak.day), cost: formatCost(peak.cost) })}
          </span>
        )}
      </div>
      {hover === undefined ? null : (
        <CalendarTooltip
          hover={hover}
          cellSize={cellSize}
          t={t}
          formatCost={formatCost}
          formatInteger={formatInteger}
          formatDay={formatDay}
        />
      )}
    </figure>
  )
}
