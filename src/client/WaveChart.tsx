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
import { prefersReducedMotion } from './count-up.ts'
import { wavePlot, waveSeries } from './wave.ts'
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
  /** Whether the range's fold is still running: the wave shows a tide instead. */
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
export function WaveChart({ input, caption, loading, empty, locale, t, formatCost }: WaveChartProps): ReactNode {
  const points = useMemo(
    () => waveSeries(input, locale.toLowerCase().startsWith('zh')),
    [input, locale],
  )
  const plot = useMemo(() => wavePlot(points), [points])
  const line = swellPath(plot)
  const area = line === '' ? '' : `${line} L ${String(VIEW_WIDTH)} ${String(VIEW_HEIGHT)} L 0 ${String(VIEW_HEIGHT)} Z`
  const peak = points.reduce((best, point) => (point.cost > best ? point.cost : best), 0)
  // The whale is the product's own animal, and it swims only where there is water
  // to swim in: a loading frame and an empty window are not a picture it belongs
  // in. A reader who asked for less motion gets it at rest, still visible.
  const swimming = !loading && !empty
  const still = useMemo(() => prefersReducedMotion(), [])
  const total = points.reduce((sum, point) => sum + point.cost, 0)

  return (
    <figure className={css.wave} aria-label={t('waveTitle')}>
      <figcaption className={css.waveCaption}>
        <span className={css.waveTitle}>{t('waveTitle')}</span>
        <span className={css.waveScope}>{caption}</span>
        {empty || loading ? null : <span className={css.waveTotal}>{formatCost(total)}</span>}
      </figcaption>

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
          {/* The tide: the same swell, drawn three times and slid across, which
            * reads as water rather than as a spinner standing in for data. */}
          {loading ? (
            <g className={css.waveTide}>
              {[0, 1, 2].map(index => (
                <path key={index} className={css.waveTidePath} d={TIDE_PATH} transform={`translate(${String(index * 333)}, 0)`} />
              ))}
            </g>
          ) : null}
          {empty || loading ? null : (
            <>
              <path className={css.waveArea} d={area} fill="url(#dlu-wave-fill)" />
              <path className={css.waveLine} d={line} vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
        {empty && !loading ? <p className={css.waveEmpty}>{t('noUsage')}</p> : null}
        {/* Kept out of the drawing above: that SVG stretches to fill the width
          * without preserving its own aspect, so anything shaped inside it — a
          * whale most of all — would come out squashed. This layer is measured in
          * CSS pixels, where the animal keeps the proportions it was drawn at. */}
        {swimming && (
          <span className={css.waveSwimmer} data-still={still}>
            {/* The product's own animal, from the same geometry its logo is
              * drawn with — the package exports the path for exactly this, and a
              * hand-drawn lookalike beside it would only ever be a lookalike. */}
            <svg
              viewBox={`0 0 ${String(FISH_LOGO_VIEWBOX.width)} ${String(FISH_LOGO_VIEWBOX.height)}`}
              width="46"
              height={(46 * FISH_LOGO_VIEWBOX.height) / FISH_LOGO_VIEWBOX.width}
              aria-hidden="true"
              focusable="false"
            >
              <path className={css.waveWhale} d={FISH_LOGO_PATH} />
            </svg>
          </span>
        )}
      </div>

      {empty || loading ? null : (
        <div className={css.waveAxis}>
          <span>{points[0]?.label ?? ''}</span>
          <span className={css.wavePeak}>{t('wavePeak', { cost: formatCost(peak) })}</span>
          <span>{points[points.length - 1]?.label ?? ''}</span>
        </div>
      )}
    </figure>
  )
}

/**
 * One period of the loading swell.
 *
 * A hand-written hump wide enough that three of them tile without a seam; it is
 * slid rather than morphed, because a shape that changes as it moves draws the
 * eye to the animation instead of to the fact that something is coming.
 */
const TIDE_PATH = 'M 0 150 C 60 120, 110 120, 166 150 C 222 180, 272 180, 333 150 L 333 220 L 0 220 Z'
