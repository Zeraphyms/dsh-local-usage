/** Shared-history fingerprints for ordinary forks; no message text is retained. */
import { createHash } from 'node:crypto'
import type { SessionEvent } from '@deepseek-ai/dsh-session/types'

/**
 * Identify an original conversation by its exact log prefix through its first user message.
 * A fork must have inherited that entire prefix; a new prompt after an empty fork
 * is a separate conversation. Subagents are always independent.
 * @param events - full log including the inherited prefix.
 * @param inherited - inherited prefix length, zero for an original session.
 * @param seeded - whether this session was created from a fork seed.
 * @param subagent - whether the header classifies this session as a subagent.
 * @returns an opaque fixed-length conversation id when history establishes one.
 */
export function sessionChainId(events: readonly SessionEvent[], inherited: number, seeded: boolean, subagent: boolean): string | undefined {
  if (subagent || events.some(event => String(event.type) === 'subagent/descriptor')) return undefined
  const hash = createHash('sha256')
  for (const event of events) {
    if (seeded && event.seq >= inherited) return undefined
    hash.update(JSON.stringify(event, (_key, value: unknown) => {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0))
      }
      return value
    }))
    hash.update('\n')
    if (event.type === 'user/message') return 'chain:' + hash.digest('hex')
  }
  return undefined
}
