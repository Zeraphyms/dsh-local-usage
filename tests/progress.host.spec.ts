/**
 * The published read progress.
 *
 * The panel draws a bar from these numbers, so what is pinned here is the
 * contract rather than the arithmetic: a read announces itself before it knows
 * its size, states that size once it does, counts every fold, and settles whether
 * it succeeded or failed. A poller that never sees the settle would spin forever.
 *
 * @module dsh-local-usage/tests/progress
 */

import { describe, expect, it } from 'vitest'
import { createProgressTracker } from '../src/progress.ts'

/** A clock the test moves by hand, so a phase change can be timed exactly. */
function handClock(start = 0): { now: () => number; set: (value: number) => void } {
  let current = start
  return { now: () => current, set: (value) => { current = value } }
}

describe('createProgressTracker', () => {
  it('is idle and unstarted before anything runs', () => {
    expect(createProgressTracker().read()).toEqual({ phase: 'idle', done: 0, total: 0, startedAt: 0 })
  })

  it('announces a listing before the corpus size is known', () => {
    const clock = handClock(1000)
    const progress = createProgressTracker(clock.now)
    progress.begin()

    expect(progress.read()).toEqual({ phase: 'listing', done: 0, total: 0, startedAt: 1000 })
  })

  it('counts folds against the size the listing settled on', () => {
    const progress = createProgressTracker(handClock(1000).now)
    progress.begin()
    progress.plan(3)
    progress.advance()
    progress.advance()

    expect(progress.read()).toEqual({ phase: 'reading', done: 2, total: 3, startedAt: 1000 })
  })

  it('never counts more folds than the plan it published', () => {
    const progress = createProgressTracker(handClock(1000).now)
    progress.begin()
    progress.plan(2)
    progress.advance()
    progress.advance()
    progress.advance()

    // The panel prints this as "done / total"; 138 / 92 is a contradiction, not
    // a rounding error, so the cap is part of the contract.
    expect(progress.read()).toMatchObject({ done: 2, total: 2 })
  })

  it('keeps the read start time across its phases', () => {
    const progress = createProgressTracker(handClock(1000).now)
    progress.begin()
    progress.plan(1)
    progress.advance()
    progress.pricing()

    expect(progress.read()).toMatchObject({ phase: 'pricing', done: 1, total: 1, startedAt: 1000 })
  })

  it('settles to idle with the final counts and the instant it finished', () => {
    const clock = handClock(1000)
    const progress = createProgressTracker(clock.now)
    progress.begin()
    progress.plan(2)
    progress.advance()
    progress.advance()
    clock.set(3000)
    progress.finish()

    expect(progress.read()).toEqual({ phase: 'idle', done: 2, total: 2, startedAt: 1000, finishedAt: 3000 })
  })

  it('settles a read that never got as far as listing its corpus', () => {
    const clock = handClock(1000)
    const progress = createProgressTracker(clock.now)
    progress.begin()
    clock.set(2000)
    progress.finish()

    expect(progress.read()).toEqual({ phase: 'idle', done: 0, total: 0, startedAt: 1000, finishedAt: 2000 })
  })
})
