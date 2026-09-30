/**
 * What the summary strip is showing, and what it is still waiting for.
 *
 * The strip used to be discarded the moment a range changed and rebuilt when the
 * answer came back: for one round trip the page's tallest block collapsed into a
 * single line and everything under it jumped up, then jumped back. A re-price is
 * only milliseconds — the samples are already in hand — so the reader was being
 * shown a layout wobble for a wait they would never have noticed.
 *
 * The rule this module encodes is therefore: **figures stay mounted until they
 * are replaced**, and they keep naming the range they were folded for, which is
 * not the range selected while a switch is in flight. That second part matters as
 * much as the first — a strip that shows the old window's numbers under the new
 * window's label is worse than one that flickers.
 *
 * The "still folding" state is split in two on purpose. `pending` is the truth and
 * is immediate; `slow` is the part worth drawing, and the panel only sets it after
 * a delay. Without that split the strip would dim on every switch for a few
 * milliseconds, which is a flicker of its own.
 *
 * @module dsh-local-usage/client/summary-state
 */

import type { UsageInsightsReport } from '../types.ts'

/** What the summary slot holds. */
export type SummaryState =
  /** Nothing selected, or the panel is not the active one. */
  | { readonly status: 'idle' }
  /** The first fold for this mount: there are no figures to keep yet. */
  | { readonly status: 'loading' }
  /** The fold failed and the figures it was to replace are gone with it. */
  | { readonly status: 'error' }
  | {
    readonly status: 'ready'
    readonly report: UsageInsightsReport
    /** The range these figures describe; the selected one while a switch is in flight. */
    readonly rangeId: string
    /** A fold for another range is in flight. */
    readonly pending: boolean
    /** That fold has taken long enough to be worth admitting to. */
    readonly slow: boolean
  }

/** The panel was left, so the strip holds nothing. */
export function summaryIdle(): SummaryState {
  return { status: 'idle' }
}

/**
 * A fold began.
 *
 * Figures already on screen stay, marked as not yet replaced; the first fold of a
 * mount has none, so it falls back to the loading frame.
 *
 * @param previous - the state before the fold.
 * @returns the state to render while it runs.
 */
export function summaryStarted(previous: SummaryState): SummaryState {
  return previous.status === 'ready' ? { ...previous, pending: true, slow: false } : { status: 'loading' }
}

/**
 * The fold is taking long enough that a reader would otherwise think it had
 * finished.
 *
 * @param previous - the state while the fold runs.
 * @returns the same state, admitting to the wait.
 */
export function summarySlow(previous: SummaryState): SummaryState {
  return previous.status === 'ready' && previous.pending ? { ...previous, slow: true } : previous
}

/**
 * A fold landed.
 *
 * @param report - the report it answered with.
 * @param rangeId - the range it was folded for.
 * @returns the state that replaces the strip's figures.
 */
export function summarySettled(report: UsageInsightsReport, rangeId: string): SummaryState {
  return { status: 'ready', report, rangeId, pending: false, slow: false }
}

/**
 * A fold failed.
 *
 * The previous figures are deliberately not kept here. They describe another
 * range, and with the selection already moved there would be nothing on screen to
 * say so — a wrong number is worse than a missing one, and the failure carries its
 * own retry.
 *
 * @returns the failure state.
 */
export function summaryFailed(): SummaryState {
  return { status: 'error' }
}
