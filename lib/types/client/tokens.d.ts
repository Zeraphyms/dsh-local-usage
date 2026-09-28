/**
 * Token arithmetic shared by the panel's views.
 *
 * One definition of "how many tokens a row is worth": the four buckets are
 * disjoint, so the total is their sum, and a view that ranked or filtered on a
 * different total would quietly disagree with the tiles above it.
 *
 * @module dsh-local-usage/client/tokens
 */
import type { UsageTokens } from '../types.ts';
/**
 * Total tokens of any token-bearing row.
 * @param row - a row carrying the four provider buckets.
 * @returns the sum of the four buckets.
 */
export declare function tokensOf(row: UsageTokens): number;
