import type { SessionEvent } from '@deepseek-ai/dsh-session/types';
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
export declare function sessionChainId(events: readonly SessionEvent[], inherited: number, seeded: boolean, subagent: boolean): string | undefined;
