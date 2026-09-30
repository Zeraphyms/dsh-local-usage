/**
 * The one entrance the panel plays: its figures filling in from zero.
 *
 * The first read takes seconds and then the page simply appears. Counting the
 * figures up over half a second is the single orchestrated moment that says the
 * panel has finished reading rather than that it was always there — and it is
 * confined to one moment on purpose. Replaying it on every range change would
 * turn reading a figure into waiting for one, and a number that is still moving
 * is a number nobody can compare against the one beside it.
 *
 * What the entrance moves is a single share of the way to the figures, not each
 * figure on its own clock: one animation scales the hero and every tile together,
 * so the row reads as one thing filling in rather than eight of them racing. The
 * arithmetic is pure, so the shape of the entrance is testable without a browser,
 * and the hook beside it only supplies the clock.
 *
 * @module dsh-local-usage/client/count-up
 */

import { useEffect, useRef, useState } from 'react'

/** How long the entrance runs, in milliseconds. */
export const COUNT_UP_MS = 520

/**
 * Whether the reader has asked the platform for less motion.
 * @returns true when animations should be replaced by their end state.
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Ease-out cubic: fast off zero, settling onto the figure.
 * @param progress - elapsed share of the entrance, clamped to `0..1`.
 * @returns the eased share.
 */
export function easeOutCubic(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress))
  return 1 - (1 - clamped) ** 3
}

/**
 * The share of the way to the figures an entrance has reached.
 * @param elapsed - milliseconds since the entrance began.
 * @param duration - length of the entrance; `0` snaps straight to the end.
 * @returns a share in `0..1`.
 */
export function entranceAt(elapsed: number, duration: number = COUNT_UP_MS): number {
  if (duration <= 0) return 1
  return easeOutCubic(elapsed / duration)
}

/**
 * One figure part-way through an entrance.
 * @param target - the figure the entrance ends on.
 * @param elapsed - milliseconds since the entrance began.
 * @param duration - length of the entrance; `0` snaps straight to the target.
 * @returns the figure to render now.
 */
export function countUpAt(target: number, elapsed: number, duration: number = COUNT_UP_MS): number {
  return target * entranceAt(elapsed, duration)
}

/**
 * The entrance's share, animated once when the panel asks for it.
 *
 * `animate` is the panel's decision, not this hook's, because only the panel
 * knows whether this is the read that opened the page or a range change on top of
 * one already read. An entrance that is refused — a reader who asked for less
 * motion, or a second mount — reports itself finished immediately, so the panel
 * stops waiting on it either way.
 *
 * @param animate - whether this render is the entrance.
 * @param onDone - called once the entrance has landed or been refused.
 * @returns the share of the way to the figures, `1` when not animating.
 */
export function useEntrance(animate: boolean, onDone?: () => void): number {
  const [share, setShare] = useState(animate ? 0 : 1)
  const settled = useRef(!animate)
  // Held by reference so an inline callback does not restart the entrance on
  // every render, which is what a dependency on it would do.
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    if (!animate || settled.current || prefersReducedMotion()) {
      settled.current = true
      setShare(1)
      done.current?.()
      return
    }
    settled.current = true
    let frame = 0
    const start = performance.now()
    const tick = (now: number): void => {
      const elapsed = now - start
      setShare(entranceAt(elapsed))
      if (elapsed < COUNT_UP_MS) frame = requestAnimationFrame(tick)
      else done.current?.()
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame) }
  }, [animate])

  return share
}
