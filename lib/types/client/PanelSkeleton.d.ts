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
import { type ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { UsageInsightsProgress } from '../types.ts';
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
export declare function HeroSkeleton(): ReactNode;
/**
 * The tiles row's frame, at the same track sizing the real one uses.
 * @returns the tiles' placeholder.
 */
export declare function TilesSkeleton(): ReactNode;
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
export declare function SummarySkeleton(): ReactNode;
/**
 * The day page's per-directory table, before it has any rows.
 *
 * A real table with real cells: the columns are sized by the same rules as the
 * rows that replace them, so a slow day fold fills the frame instead of resizing
 * it. The heading keeps its own box for the same reason.
 *
 * @returns the table's placeholder.
 */
export declare function ProjectsSkeleton(): ReactNode;
/** Props for the loading frame. */
export interface PanelSkeletonProps {
    /** The read's published progress, or `undefined` while none has been reported. */
    readonly progress: UsageInsightsProgress | undefined;
    /** Week columns the calendar spans. */
    readonly weeks: number;
    readonly t: PropsLocale<'usage'>['t'];
}
/**
 * Render the loading frame.
 * @param props - the read's progress, the calendar window, and the dictionary.
 * @returns the frame the real panel replaces.
 */
export declare function PanelSkeleton({ progress, weeks, t }: PanelSkeletonProps): ReactNode;
