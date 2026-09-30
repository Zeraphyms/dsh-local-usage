/**
 * The calendar's measured geometry.
 *
 * The grid is a CSS grid of fixed-size cells whose edge is measured from the
 * panel — never fractional tracks, because a cell whose box depends on its track
 * width has no stable intrinsic size to lay out against, which is what makes
 * dense grids collapse. Below the width that fits a whole year at the minimum
 * edge the grid keeps that edge and drops its oldest weeks, so it never scrolls
 * sideways.
 *
 * It lives apart from the calendar because two things are measured with it: the
 * year of cells, and the frame drawn in its place while the first read runs. A
 * skeleton that computed its own geometry would be a second opinion about the
 * layout, and the figure would jump the moment the real one arrived.
 *
 * @module dsh-local-usage/client/heatmap-measure
 */

import { useEffect, useRef, useState, type RefObject } from 'react'

/** Narrowest cell edge; below the width that fits a year of them the grid trims weeks. */
export const MIN_CELL_SIZE = 15

/** Gutter between two cells, in the same fixed pixels as the cell edge. */
export const CELL_GAP = 4

/** Weekday-label gutter, reserved on the same fixed scale as the cells. */
export const LABEL_WIDTH = 20

/**
 * The cell edge that fills `width`, never below the minimum.
 * @param width - the measured container width.
 * @param columns - columns the grid is laying out.
 * @returns the cell edge in whole pixels.
 */
export function cellSizeFor(width: number, columns: number): number {
  const gaps = Math.max(0, columns - 1) * CELL_GAP
  const available = Math.max(0, width - LABEL_WIDTH - gaps)
  return Math.max(1, Math.floor(available / columns) || 1)
}

/**
 * Track the widest cell edge the container can carry, and how many weeks then fit.
 * @param totalColumns - columns the full window spans.
 * @returns the element to measure, the cell edge, and the visible column count.
 */
export function useResponsiveGrid(totalColumns: number): {
  containerRef: RefObject<HTMLDivElement>
  cellSize: number
  columns: number
} {
  const containerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState({ cellSize: MIN_CELL_SIZE, columns: totalColumns })

  useEffect(() => {
    const element = containerRef.current
    if (element === null || totalColumns <= 0) return
    const update = (): void => {
      const width = element.clientWidth
      const fitted = Math.floor((width - LABEL_WIDTH + CELL_GAP) / (MIN_CELL_SIZE + CELL_GAP))
      const columns = Math.max(1, Math.min(totalColumns, fitted || 1))
      setState(columns >= totalColumns
        ? { cellSize: cellSizeFor(width, totalColumns), columns: totalColumns }
        : { cellSize: MIN_CELL_SIZE, columns })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => { observer.disconnect() }
  }, [totalColumns])

  return { containerRef, ...state }
}
