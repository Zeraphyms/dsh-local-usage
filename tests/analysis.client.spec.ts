/**
 * The readings the detail view draws from a report.
 *
 * These are the page's arithmetic, so what is pinned here is the meaning rather
 * than the layout: a change with nothing to divide by states no rate, the
 * weekday profile always answers seven rows whatever the window did, and the
 * exported table carries raw figures because a spreadsheet is not a reader.
 *
 * @module dsh-local-usage/tests/analysis
 */

import { describe, expect, it } from 'vitest'
import { changeOf, daysToCsv, largestOf, topSessions, weekdayProfile } from '../src/client/analysis.ts'
import { dayKey } from '../src/client/heatmap-grid.ts'
import type { UsageDayRow, UsageSessionRow } from '../src/types.ts'

/** One day row with only the fields the profiles read. */
function day(date: Date, cost: number, calls = 1): UsageDayRow {
  return {
    day: dayKey(date.getTime()),
    cost,
    calls,
    uncachedInputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    sessions: 1,
  }
}

/** One session row with only the fields the list reads. */
function session(id: string, cost: number, updatedAt = 0): UsageSessionRow {
  return {
    sessionId: id,
    cost,
    updatedAt,
    createdAt: 0,
    calls: 1,
    uncachedInputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  }
}

describe('changeOf', () => {
  it('states the movement and the rate when there is a base to divide by', () => {
    expect(changeOf(150, 100)).toEqual({ value: 150, previous: 100, delta: 50, ratio: 0.5 })
  })

  it('states a fall as a negative rate rather than as a smaller number', () => {
    expect(changeOf(80, 100)).toMatchObject({ delta: -20, ratio: -0.2 })
  })

  it('states no rate when the window before it spent nothing', () => {
    // A window that started from zero did not grow by a percentage, and printing
    // one would invent a rate out of a zero.
    const change = changeOf(12, 0)
    expect(change.ratio).toBeUndefined()
    expect(change.delta).toBe(12)
  })

  it('states no rate when neither window spent anything', () => {
    // 0/0 is not a rate either: the delta is the whole of what can be said.
    expect(changeOf(0, 0)).toEqual({ value: 0, previous: 0, delta: 0 })
  })
})

describe('weekdayProfile', () => {
  it('always answers seven rows, Sunday first', () => {
    const rows = weekdayProfile([])
    expect(rows).toHaveLength(7)
    expect(rows.map(row => row.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(rows.every(row => row.cost === 0 && row.calls === 0)).toBe(true)
  })

  it('folds each day into its own local weekday', () => {
    // 2026-09-21 is a Monday; 2026-09-20 the Sunday before it.
    const monday = new Date(2026, 8, 21)
    const sunday = new Date(2026, 8, 20)
    const rows = weekdayProfile([day(monday, 3, 2), day(sunday, 5, 1)])

    expect(rows[1]).toEqual({ weekday: 1, cost: 3, calls: 2 })
    expect(rows[0]).toEqual({ weekday: 0, cost: 5, calls: 1 })
  })

  it('adds up two weeks of the same weekday', () => {
    const rows = weekdayProfile([
      day(new Date(2026, 8, 21), 3),
      day(new Date(2026, 8, 28), 4),
    ])

    expect(rows[1]?.cost).toBe(7)
    expect(rows[1]?.calls).toBe(2)
  })

  it('ignores a day key it cannot read rather than dropping the whole profile', () => {
    const rows = weekdayProfile([{ ...day(new Date(2026, 8, 21), 3), day: 'not-a-day' }])
    expect(rows.every(row => row.cost === 0)).toBe(true)
  })
})

describe('largestOf', () => {
  it('measures the largest value a column reaches', () => {
    expect(largestOf([{ v: 2 }, { v: 9 }, { v: 4 }], row => row.v)).toBe(9)
  })

  it('answers zero for no rows, so a bar chart divides by nothing it cannot', () => {
    expect(largestOf([], (row: { v: number }) => row.v)).toBe(0)
  })

  it('never returns a negative, so a refund cannot flip a chart', () => {
    expect(largestOf([{ v: -5 }], row => row.v)).toBe(0)
  })
})

describe('topSessions', () => {
  it('orders by cost, dearest first', () => {
    const rows = topSessions([session('a', 1), session('c', 9), session('b', 5)], 10)
    expect(rows.map(row => row.sessionId)).toEqual(['c', 'b', 'a'])
  })

  it('keeps at most the limit asked for', () => {
    const rows = topSessions([session('a', 1), session('b', 2), session('c', 3)], 2)
    expect(rows.map(row => row.sessionId)).toEqual(['c', 'b'])
  })

  it('breaks a tie on the later session, so the order is stable and meaningful', () => {
    const rows = topSessions([session('old', 5, 1), session('new', 5, 2)], 10)
    expect(rows.map(row => row.sessionId)).toEqual(['new', 'old'])
  })

  it('leaves the report’s own array in the order it arrived', () => {
    const source = [session('a', 1), session('b', 9)]
    topSessions(source, 10)
    expect(source.map(row => row.sessionId)).toEqual(['a', 'b'])
  })

  it('answers nothing for a limit of zero', () => {
    expect(topSessions([session('a', 1)], 0)).toEqual([])
  })
})

describe('daysToCsv', () => {
  it('writes a header and one line per day, with raw figures', () => {
    const csv = daysToCsv([day(new Date(2026, 8, 21), 1.5, 3)])
    const [header, row, ...rest] = csv.trimEnd().split('\n')

    expect(header).toBe('day,cost,uncachedInputTokens,outputTokens,cacheReadTokens,cacheWriteTokens,calls,sessions')
    expect(row).toBe('2026-09-21,1.5,0,0,0,0,3,1')
    expect(rest).toEqual([])
  })

  it('quotes a field that would otherwise break the table', () => {
    // No column can currently carry one, but a quoting rule that is only correct
    // by accident is one that breaks the first time a column is added.
    const csv = daysToCsv([{ ...day(new Date(2026, 8, 21), 1), day: 'a,b' }])
    expect(csv.split('\n')[1]?.startsWith('"a,b"')).toBe(true)
  })

  it('ends with a newline, so an appended line is not glued to the last one', () => {
    expect(daysToCsv([day(new Date(2026, 8, 21), 1)]).endsWith('\n')).toBe(true)
  })

  it('writes a header even for an empty window', () => {
    expect(daysToCsv([])).toBe(
      'day,cost,uncachedInputTokens,outputTokens,cacheReadTokens,cacheWriteTokens,calls,sessions\n',
    )
  })
})
