/**
 * The range's spend as one blue wave.
 *
 * Hand-drawn SVG rather than a chart component, because there is no chart
 * component: this product's other figures — the wordmark, the permission icons,
 * the plugin artwork — are drawn the same way, and a plugin that installs
 * without running code is not the place to add a rendering engine for one shape.
 *
 * The wave is a whale's back on purpose. It is the shape the rest of the product
 * is drawn in, its fill is the brand blue mixed into the page rather than a
 * second palette, and a reader who has seen any DeepSeek surface already knows
 * how to read it. The area is smoothed through the midpoints between points, so
 * the curve reads as one swell instead of as the sample count.
 *
 * @module dsh-local-usage/client/WaveChart
 */

import { useMemo, type ReactNode } from 'react'
import { FISH_LOGO_PATH, FISH_LOGO_VIEWBOX } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { wavePlot, waveRoutes, waveSeries } from './wave.ts'
import type { WaveInput } from './wave.ts'
import { css } from './classes.ts'

/**
 * The drawing's own coordinate space.
 *
 * Fixed rather than measured: the path is laid out once in these units and the
 * figure scales it, so the shape never depends on a resize landing before the
 * first paint. The stroke opts out of that scale, which is why the line stays the
 * width it was drawn at however wide the panel is.
 */
const VIEW_WIDTH = 1000
const VIEW_HEIGHT = 220
/** Headroom kept above the swell, as a share of the height. */
const CREST = 0.88

/**
 * How many points the axis names.
 *
 * Enough to place a swell in time, few enough that the labels never touch: a
 * year reads as seven months named, a day as seven hours, and the ends are
 * always two of them so the window's own bounds are on the axis.
 */
const MAX_TICKS = 7

/** Props for the wave. */
export interface WaveChartProps {
  /** The range's folds. */
  readonly input: WaveInput
  /**
   * The label the wave is showing, already translated: the range's name.
   *
   * Passed in rather than resolved here because the range's names live in the
   * panel's dictionary and this figure has no other use for it.
   */
  readonly caption: string
  /** Nothing to draw yet: the frame shows the tide instead of a swell. */
  readonly loading: boolean
  /** Whether the wave has anything to draw. */
  readonly empty: boolean
  /** Active locale id, which decides how a month bucket is named. */
  readonly locale: string
  readonly t: PropsLocale<'usage'>['t']
  /** Currency formatter for the axis extremes. */
  readonly formatCost: (value: number) => string
}

/** Smooth a series through the midpoints between its points. */
function swellPath(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  const first = points[0]
  if (first === undefined) return ''
  let path = `M ${(first.x * VIEW_WIDTH).toFixed(2)} ${((1 - first.y * CREST) * VIEW_HEIGHT).toFixed(2)}`
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const point = points[index]
    if (previous === undefined || point === undefined) continue
    const px = previous.x * VIEW_WIDTH
    const py = (1 - previous.y * CREST) * VIEW_HEIGHT
    const x = point.x * VIEW_WIDTH
    const y = (1 - point.y * CREST) * VIEW_HEIGHT
    const mid = (px + x) / 2
    // Horizontal control points at the midpoint: the curve leaves and arrives
    // flat, which is what makes a handful of samples read as one swell.
    path += ` C ${mid.toFixed(2)} ${py.toFixed(2)}, ${mid.toFixed(2)} ${y.toFixed(2)}, ${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return path
}

/**
 * Render the range's spend as a wave.
 * @param props - the range's folds, its name, its state, and the formatter.
 * @returns the figure.
 */
export function WaveChart({
  input, caption, loading, empty, locale, t, formatCost,
}: WaveChartProps): ReactNode {
  const zh = locale.toLowerCase().startsWith('zh')
  const points = useMemo(() => waveSeries(input, zh), [input, zh])
  const plot = useMemo(() => wavePlot(points), [points])
  // The models over the window, each drawn on the total's own scale: a curve
  // normalised to itself would say every model is a hundred percent of
  // something, which is the one thing a reader is not asking.
  const routeLines = useMemo(() => {
    const largest = points.reduce((best, point) => (point.cost > best ? point.cost : best), 0)
    return waveRoutes(input, zh).map(swell => ({
      route: swell.route,
      cost: swell.cost,
      path: swellPath(swell.points.map((point, at) => ({
        x: plot[at]?.x ?? 0,
        y: largest <= 0 ? 0 : point.cost / largest,
      }))),
    }))
  }, [input, zh, plot, points])
  const line = swellPath(plot)
  const area = line === '' ? '' : `${line} L ${String(VIEW_WIDTH)} ${String(VIEW_HEIGHT)} L 0 ${String(VIEW_HEIGHT)} Z`
  const peak = points.reduce((best, point) => (point.cost > best ? point.cost : best), 0)
  // A fixed stride, not an even division of the point count: dividing a series of
  // ten months into seven labels rounds to 1, 3, 4, 6, 7, 9, 10 — an axis whose
  // gaps alternate, which reads as a bug rather than as an axis. A stride gives
  // every gap the same width, and the cost of that is the last bucket sometimes
  // going unnamed.
  const ticks = useMemo(() => {
    if (points.length === 0) return []
    const stride = [1, 2, 3, 4, 6, 12].find(step => Math.ceil(points.length / step) <= MAX_TICKS)
      ?? Math.ceil(points.length / MAX_TICKS)
    const chosen: {
      readonly index: number
      readonly x: number
      readonly y: number
      readonly label: string
      readonly cost: number
    }[] = []
    for (let index = 0; index < points.length; index += stride) {
      const point = points[index]
      if (point === undefined) continue
      chosen.push({
        index,
        x: plot[index]?.x ?? 0,
        y: plot[index]?.y ?? 0,
        label: point.label,
        cost: point.cost,
      })
    }
    return chosen
  }, [plot, points])
  const total = points.reduce((sum, point) => sum + point.cost, 0)

  return (
    <figure className={css.wave} aria-label={t('waveTitle')}>
      <figcaption className={css.waveCaption}>
        <span className={css.waveTitle}>{t('waveTitle')}</span>
        <span className={css.waveScope}>{caption}</span>
        {empty || loading ? null : (
          <span className={css.wavePeak}>{t('wavePeak', { cost: formatCost(peak) })}</span>
        )}
        {empty || loading ? null : <span className={css.waveTotal}>{formatCost(total)}</span>}
      </figcaption>

      {/* Named before the water rather than after it: a reader who meets four
        * curves at once needs to know what they are before reading their shape. */}
      {empty || loading || routeLines.length === 0 ? null : (
        <div className={css.waveLegend}>
          {routeLines.map((swell, index) => (
            <span key={swell.route} className={css.waveLegendItem}>
              <span className={css.waveLegendSwatch} data-color={String(index % ROUTE_LINES)} />
              <span className={css.waveLegendRoute} title={swell.route}>{swell.route}</span>
              <span className={css.waveLegendCost}>{formatCost(swell.cost)}</span>
            </span>
          ))}
        </div>
      )}

      <div className={css.waveFrame} data-loading={loading}>
        <svg
          className={css.waveSvg}
          viewBox={`0 0 ${String(VIEW_WIDTH)} ${String(VIEW_HEIGHT)}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={t('waveTitle')}
        >
          <defs>
            {/* The fill is the brand blue at a low mix into the page, so the wave
              * belongs to the surface it is drawn on in either theme rather than
              * carrying a palette of its own. */}
            <linearGradient id="dlu-wave-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className={css.waveStopTop} />
              <stop offset="100%" className={css.waveStopBottom} />
            </linearGradient>
          </defs>
          {empty || loading ? null : (
            <>
              {/* The named points, as points: a dot on the swell and a plumb line
                * down to the waterline. Not a grid across the figure — that would
                * slice the one bold thing here into seven panels and read as a
                * chart component's default chrome. This says which sample the
                * label belongs to, and how high that sample reached. */}
              {ticks.map(tick => (
                <g key={tick.index}>
                  <line
                    className={css.waveRule}
                    x1={tick.x * VIEW_WIDTH}
                    x2={tick.x * VIEW_WIDTH}
                    y1={(1 - tick.y * CREST) * VIEW_HEIGHT}
                    y2={VIEW_HEIGHT}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    className={css.waveNode}
                    cx={tick.x * VIEW_WIDTH}
                    cy={(1 - tick.y * CREST) * VIEW_HEIGHT}
                    r={2.6}
                  />
                </g>
              ))}
              <g className={css.wavePlot}>
                <path className={css.waveArea} d={area} fill="url(#dlu-wave-fill)" />
                {/* The models, over the window they make up. Thin strokes that
                  * opt out of the figure's scale, so a curve is a hairline at
                  * every panel width rather than a band at the wide ones. */}
                {routeLines.map((swell, index) => (
                  <path
                    key={swell.route}
                    className={css.waveRoute}
                    data-color={String(index % ROUTE_LINES)}
                    d={swell.path}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <path className={css.waveLine} d={line} vectorEffect="non-scaling-stroke" />
              </g>
            </>
          )}
        </svg>
        {empty && !loading ? <p className={css.waveEmpty}>{t('noUsage')}</p> : null}
        {/* Waiting, as the product's own animal: the logo's whale in the middle of
          * the frame with a spout over its head, the column rising and falling on
          * the beat of a breath. It is drawn here rather than inside the figure
          * above because that SVG stretches to whatever width the panel has
          * without keeping its own aspect, and a whale put through it comes out
          * flat at every width but one. */}
        {loading ? (
          <span className={css.waveSpout} aria-hidden="true">
            {/* The column stands on the whale's head and grows upward from it:
              * its own origin is the bottom of its box, so the breath climbs
              * instead of stretching both ways. Two drops clear its lip. Placed
              * in the stack rather than at coordinates inside the logo's own
              * path, where the blowhole is not a thing the geometry names. */}
            <svg className={css.waveSpoutJet} viewBox="-8 -16 42 50" width="32" height="38" focusable="false">
              <path d="M13 33.5 C9.6 24 9.9 14.5 13 5.6 C16.1 14.5 16.4 24 13 33.5 Z" />
              {/* The break at the top: the column does not end in a point, it
                * comes apart. Six drops over the tip, scaling away from it |
                * they fan outward rather than rising as a block. */}
              <g className={css.waveSpoutSpray}>
                <circle cx="13" cy="-6.4" r="1.9" />
                <circle cx="9.4" cy="-4.4" r="1.5" />
                <circle cx="16.6" cy="-4.4" r="1.5" />
                <circle cx="5.8" cy="-1.6" r="1.2" />
                <circle cx="20.2" cy="-1.6" r="1.2" />
                <circle cx="3.2" cy="-8.4" r="0.95" />
                <circle cx="22.6" cy="-8.4" r="0.95" />
              </g>
            </svg>
            <svg
              className={css.waveSpoutWhale}
              viewBox={`0 0 ${String(FISH_LOGO_VIEWBOX.width)} ${String(FISH_LOGO_VIEWBOX.height)}`}
              width="42"
              height={(42 * FISH_LOGO_VIEWBOX.height) / FISH_LOGO_VIEWBOX.width}
              focusable="false"
            >
              <path d={FISH_LOGO_PATH} />
            </svg>
            {/* The water it floats on: two rings widening away from the body, one
              * behind the other, which is what makes the animal look held up
              * rather than pasted on. */}
            <svg className={css.waveSpoutWater} viewBox="0 0 84 14" width="84" height="14" focusable="false">
              <ellipse className={css.waveSpoutRipple} cx="42" cy="7" rx="17" ry="3.4" />
              <ellipse className={css.waveSpoutRipple} cx="42" cy="7" rx="17" ry="3.4" data-lag="true" />
            </svg>
          </span>
        ) : null}
      </div>

      {/* Always present: the row is 15px of the figure, and leaving it out while
        * a fold ran made the page under the chart shift down when the fold landed. */}
      {empty || loading
        ? <div className={css.waveTicks} aria-hidden="true" />
        : (
        <div className={css.waveTicks}>
          {ticks.map(tick => (
            // Positioned on the same share of the width the drawing uses, so a
            // label sits under the point it names rather than near it.
            <span
              key={tick.index}
              className={css.waveTick}
              data-edge={tick.index === 0 ? 'start' : tick.index === points.length - 1 ? 'end' : undefined}
              style={{ insetInlineStart: `${(tick.x * 100).toFixed(3)}%` }}
              title={formatCost(tick.cost)}
            >
              {tick.label}
            </span>
          ))}
        </div>
        )}
    </figure>
  )
}


/** How many curves the figure draws over its total, matching the model's cap. */
const ROUTE_LINES = 4
