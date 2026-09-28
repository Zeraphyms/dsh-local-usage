/**
 * Durable per-route rate overrides.
 *
 * The rate cards a profile is configured with are substring rules: convenient,
 * and quietly wrong the moment a route they were never written for happens to
 * contain the substring. An override is the correction — one exact
 * `provider/model`, one set of four bucket prices — and this module owns where
 * it lives.
 *
 * It is a small JSON file under the harness home rather than a storage form:
 * this plugin mounts bare on deployments that have no storage backend, and a
 * rate table the reader typed is worth persisting without making the whole panel
 * depend on a service that may not be there. The file is written through a
 * temporary sibling and renamed, so a crash mid-write cannot leave a truncated
 * table behind.
 *
 * @module dsh-local-usage/rates
 */

import { readFileSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { UsagePricingUpdate, UsageRate } from './types.ts'

/** Version of the on-disk document, bumped when its shape changes. */
const DOCUMENT_VERSION = 1

/** Highest price this plugin accepts, per million tokens, in any currency. */
const MAX_RATE = 1_000_000

/** Every bucket price, in the order the panel writes them. */
const BUCKETS = ['input', 'cacheRead', 'cacheWrite', 'output'] as const

/**
 * The harness home the override file is written under.
 * @param env - process environment, read for `DSH_HOME`.
 * @param home - the user's home directory when `DSH_HOME` is unset.
 * @returns the absolute harness home.
 */
export function resolveDshHome(
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): string {
  const configured = env.DSH_HOME?.trim()
  return configured !== undefined && configured.length > 0 ? configured : join(home, '.dsh')
}

/**
 * Where one harness home keeps this plugin's override file.
 * @param dshHome - absolute harness home.
 * @returns the absolute path of the file.
 */
export function pricingFilePath(dshHome: string): string {
  return join(dshHome, 'local-usage', 'pricing.json')
}

/**
 * Read one rate out of an untrusted value.
 * @param value - a candidate bucket map.
 * @returns the rate, or `undefined` when any bucket is not a sane non-negative price.
 */
export function readRate(value: unknown): UsageRate | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const source = value as Record<string, unknown>
  const rate: Record<string, number> = {}
  for (const bucket of BUCKETS) {
    const raw = source[bucket]
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0 || raw > MAX_RATE) return undefined
    rate[bucket] = raw
  }
  return rate as unknown as UsageRate
}

/** Read one route map out of an untrusted document, dropping entries it cannot vouch for. */
function readRoutes(value: unknown): Map<string, UsageRate> {
  const routes = new Map<string, UsageRate>()
  if (typeof value !== 'object' || value === null) return routes
  for (const [route, candidate] of Object.entries(value as Record<string, unknown>)) {
    const rate = readRate(candidate)
    if (route.length > 0 && rate !== undefined) routes.set(route, rate)
  }
  return routes
}

/** The persisted override table, kept in memory and mirrored to disk. */
export interface RateStore {
  /** Every override in effect, keyed by exact route. */
  read(): ReadonlyMap<string, UsageRate>
  /**
   * Apply one validated update and persist the result.
   * @param update - routes to set; a `null` rate clears that route's override.
   * @returns the table in effect after the write.
   */
  write(update: UsagePricingUpdate): Promise<Record<string, UsageRate>>
}

/**
 * Create the store for one file, hydrating it from disk immediately.
 *
 * Hydration is synchronous on purpose: the report path is the hot one, this runs
 * once at activation, and the document is a handful of lines. A read that fails
 * is not an error the plugin can act on — an absent or unreadable table is simply
 * no overrides, and the next write replaces the file.
 *
 * @param path - absolute path of the override file.
 * @returns the store.
 */
export function createRateStore(path: string): RateStore {
  const routes = new Map<string, UsageRate>()
  try {
    const document = JSON.parse(readFileSync(path, 'utf8')) as { version?: unknown; routes?: unknown }
    // A document from a future build is not guessed at; a bump has to bring a
    // migration with it, the way every other stored shape in this product does.
    if (document.version === DOCUMENT_VERSION) {
      for (const [route, rate] of readRoutes(document.routes)) routes.set(route, rate)
    }
  } catch {
    // No table yet: start empty.
  }

  const snapshot = (): Record<string, UsageRate> => Object.fromEntries(routes)

  return {
    read: () => routes,
    write: async (update) => {
      for (const [route, rate] of Object.entries(update.set)) {
        if (rate === null) routes.delete(route)
        else routes.set(route, rate)
      }
      const document = `${JSON.stringify({ version: DOCUMENT_VERSION, routes: snapshot() }, null, 2)}\n`
      await mkdir(dirname(path), { recursive: true })
      const temporary = `${path}.${String(process.pid)}.tmp`
      await writeFile(temporary, document, 'utf8')
      await rename(temporary, path)
      return snapshot()
    },
  }
}
