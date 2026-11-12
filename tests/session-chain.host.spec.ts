import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import { foldSession } from '../src/host/session-fold.ts'
import { sessionChainId } from '../src/host/session-chain.ts'

const original = [
  { type: 'system/message', seq: 0, time: 100, data: { role: 'system', content: 'system' } },
  { type: 'user/message', seq: 1, time: 200, data: { role: 'user', content: 'fix parser' } },
] as unknown as SessionEvent[]
const usage = (seq: number, inputTokens: number): SessionEvent => ({
  type: 'assistant/message', seq, time: 300 + seq,
  data: { turn: 1, step: 1, message: { source: { provider: 'p', model: 'm' } }, stream: [], usage: { inputTokens, outputTokens: 1 } },
} as unknown as SessionEvent)

describe('conversation history identity', () => {
  it('keeps an original, a fork and a later fork together without using their titles', () => {
    const parent = [...original, usage(2, 10)]
    const fork = [...parent, { type: 'session/end-seed', seq: 3, time: 302, data: { inherited: true } } as unknown as SessionEvent, usage(4, 20)]
    const later = [...fork, usage(5, 30)]
    const id = sessionChainId(parent, 0, false, false)
    expect(id).toMatch(/^chain:[a-f0-9]{64}$/)
    expect(sessionChainId(fork, 3, true, false)).toBe(id)
    expect(sessionChainId(later, 5, true, false)).toBe(id)
    const folded = foldSession({ events: fork, createdAt: 400, skipBefore: 3, seeded: true })
    expect(folded.chainId).toBe(id)
    expect(folded.samples).toHaveLength(1)
    expect(folded.samples[0]?.tokens.uncachedInputTokens).toBe(20)
  })

  it('separates independent prompts even when the text is the same', () => {
    const independent = original.map(event => ({ ...event, time: event.time + 1 }))
    expect(sessionChainId(independent, 0, false, false)).not.toBe(sessionChainId(original, 0, false, false))
  })

  it('does not identify an empty fork or one cut before the first prompt', () => {
    expect(sessionChainId(original, 0, true, false)).toBeUndefined()
    expect(sessionChainId(original, 1, true, false)).toBeUndefined()
    expect(sessionChainId([], 0, false, false)).toBeUndefined()
  })

  it('keeps subagents and their inherited descriptor histories independent', () => {
    expect(sessionChainId(original, 2, true, true)).toBeUndefined()
    const child = [...original, { type: 'subagent/descriptor', seq: 2, time: 250, data: {} } as unknown as SessionEvent]
    expect(sessionChainId(child, 3, true, false)).toBeUndefined()
  })

  it('ignores object property order when the same inherited events were serialized again', () => {
    const reordered = original.map(event => ({ data: event.data, time: event.time, seq: event.seq, type: event.type }) as SessionEvent)
    expect(sessionChainId(reordered, 2, true, false)).toBe(sessionChainId(original, 0, false, false))
  })
})
