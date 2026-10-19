/**
 * The window's routes, read as the models they are.
 *
 * Pricing is per model, so the reader's question about a route — "what is this
 * costing me" — is answered one level up: several vendor routes are the same
 * model at the same price, and a flat list of routes hides that. This groups the
 * route rows by the model that claimed them, summing the tokens and keeping the
 * routes visible beneath, so a model's total and the routes that made it are
 * read together rather than added up by eye.
 *
 * @module dsh-local-usage/client/route-models
 */

import type { UsageRouteRate } from '../types.ts'

/** One model, with the routes it was sold through in the window. */
export interface ModelUsage {
  /** The card's `match`, or `undefined` for the routes the fallback priced. */
  readonly model: string | undefined
  /** Tokens across every route of this model. */
  readonly tokens: number
  /** Its routes, heaviest first. */
  readonly routes: readonly UsageRouteRate[]
}

/**
 * Group the window's routes by model, heaviest model first.
 *
 * A route is kept whole rather than reduced to its name: the row still answers
 * what that particular route spent, which is what makes an aggregator's markup
 * visible when two routes of one model differ.
 *
 * @param routes - the route rows the report published.
 * @returns one entry per model, ordered by descending tokens.
 */
export function groupRouteUsage(routes: readonly UsageRouteRate[]): ModelUsage[] {
  const groups = new Map<string | undefined, UsageRouteRate[]>()
  for (const route of routes) {
    const key = route.model
    const bucket = groups.get(key)
    if (bucket === undefined) groups.set(key, [route])
    else bucket.push(route)
  }
  return [...groups.entries()]
    .map(([model, group]) => ({
      model,
      tokens: group.reduce((sum, route) => sum + route.tokens, 0),
      routes: [...group].sort((left, right) => right.tokens - left.tokens),
    }))
    .sort((left, right) => right.tokens - left.tokens || (left.model ?? '').localeCompare(right.model ?? ''))
}
