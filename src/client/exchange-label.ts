/**
 * Whether a retained quote is older than what the provider can have published.
 *
 * The reference bank releases one working-day quote each evening in Beijing
 * time, so on every working day before that release the newest possible quote
 * is still the previous working day. That gap is the source's cadence, not a
 * stale cache — and saying so is the difference between "this figure is stuck"
 * and "the bank has not published yet".
 *
 * @module dsh-local-usage/client/exchange-label
 */

/**
 * Compare a stored quote date with the newest date the provider can have published.
 *
 * @param quoteDate - the stored quote's own date, as `YYYY-MM-DD`.
 * @param expectedDate - the newest publishable date, or `undefined` when unknown.
 * @returns true while the provider still owes a newer release.
 */
export function quotePending(quoteDate: string | undefined, expectedDate: string | undefined): boolean {
  if (quoteDate === undefined || expectedDate === undefined) return false
  return quoteDate < expectedDate
}
