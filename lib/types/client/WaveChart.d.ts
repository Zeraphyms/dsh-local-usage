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
import { type ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { WaveInput } from './wave.ts';
/** Props for the wave. */
export interface WaveChartProps {
    /** The range's folds. */
    readonly input: WaveInput;
    /**
     * The label the wave is showing, already translated: the range's name.
     *
     * Passed in rather than resolved here because the range's names live in the
     * panel's dictionary and this figure has no other use for it.
     */
    readonly caption: string;
    /** Whether the range's fold is still running: the wave shows a tide instead. */
    readonly loading: boolean;
    /** Whether the wave has anything to draw. */
    readonly empty: boolean;
    /** Active locale id, which decides how a month bucket is named. */
    readonly locale: string;
    readonly t: PropsLocale<'usage'>['t'];
    /** Currency formatter for the axis extremes. */
    readonly formatCost: (value: number) => string;
}
/**
 * Render the range's spend as a wave.
 * @param props - the range's folds, its name, its state, and the formatter.
 * @returns the figure.
 */
export declare function WaveChart({ input, caption, loading, empty, locale, t, formatCost }: WaveChartProps): ReactNode;
