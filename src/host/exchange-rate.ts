/** USD/CNY reference rates retained independently from model pricing. */
import { readFileSync } from 'node:fs'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { UsageExchangeRate, UsagePricingUpdate, UsageRate } from '../types.ts'
import { readModelEdit } from '../rates.ts'

const SOURCE_URL = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=CNY'
const BEIJING_OFFSET = 8 * 60 * 60 * 1000
const DAY = 24 * 60 * 60 * 1000

/** Where the host retains its last successful reference rate. */
export function exchangeRateFilePath(dshHome: string): string {
  return join(dshHome, 'local-usage', 'exchange-rate.json')
}

/** Next Beijing noon, strictly after the supplied epoch milliseconds. */
export function nextBeijingNoon(now: number): number {
  const date = new Date(now + BEIJING_OFFSET)
  const noon = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 4)
  return noon > now ? noon : noon + DAY
}

/** Whether a snapshot predates the most recent scheduled Beijing noon. */
export function exchangeRateIsDue(rate: UsageExchangeRate, now: number): boolean {
  return rate.updatedAt < nextBeijingNoon(now) - DAY
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** Validate the public source response and round CNY per USD to three decimals. */
export function parseExchangeRate(value: unknown, now: number): UsageExchangeRate | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const source = value as Record<string, unknown>
  if (source.base !== 'USD' || !validDate(source.date) || typeof source.rates !== 'object' || source.rates === null) return undefined
  const raw = (source.rates as Record<string, unknown>).CNY
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return undefined
  const rate = Math.round(raw * 1000) / 1000
  if (!Number.isFinite(rate) || rate <= 0) return undefined
  return { rate, date: source.date, updatedAt: now }
}

/** The current reference and refresh operation for one plugin activation. */
export interface ExchangeRateStore {
  read(): UsageExchangeRate | undefined
  refresh(): Promise<UsageExchangeRate>
  dispose(): void
}

/** Load the previous snapshot; concurrent refreshes share one bounded request. */
export function createExchangeRateStore(
  path: string,
  fetchRate: (signal: AbortSignal) => Promise<unknown> = async signal => {
    const response = await fetch(SOURCE_URL, { signal })
    if (!response.ok) throw new Error('Exchange-rate source returned HTTP ' + String(response.status))
    return await response.json() as unknown
  },
): ExchangeRateStore {
  let snapshot: UsageExchangeRate | undefined
  let inFlight: Promise<UsageExchangeRate> | undefined
  const lifetime = new AbortController()
  let sequence = 0
  try {
    const document = JSON.parse(readFileSync(path, 'utf8')) as { version?: unknown; snapshot?: unknown }
    if (document.version === 1 && typeof document.snapshot === 'object' && document.snapshot !== null) {
      const stored = document.snapshot as Record<string, unknown>
      if (typeof stored.updatedAt === 'number' && Number.isFinite(stored.updatedAt) && stored.updatedAt >= 0) {
        snapshot = parseExchangeRate({ base: 'USD', date: stored.date, rates: { CNY: stored.rate } }, stored.updatedAt)
      }
    }
  } catch {
    // A missing or malformed cache has no usable rate; the next refresh replaces it.
  }
  return {
    read: () => snapshot,
    dispose: () => { lifetime.abort() },
    refresh: () => {
      if (inFlight !== undefined) return inFlight
      inFlight = (async () => {
        lifetime.signal.throwIfAborted()
        const response = await fetchRate(AbortSignal.any([lifetime.signal, AbortSignal.timeout(12_000)]))
        const candidate = parseExchangeRate(response, Date.now())
        if (candidate === undefined) throw new Error('Invalid USD/CNY exchange-rate response')
        lifetime.signal.throwIfAborted()
        sequence += 1
        const temporary = path + '.' + String(process.pid) + '.' + String(sequence) + '.tmp'
        try {
          await mkdir(dirname(path), { recursive: true })
          await writeFile(temporary, JSON.stringify({ version: 1, snapshot: candidate }) + '\n', 'utf8')
          lifetime.signal.throwIfAborted()
          await rename(temporary, path)
        } catch (error: unknown) {
          await rm(temporary, { force: true }).catch(() => {})
          throw error
        }
        snapshot = candidate
        return candidate
      })().finally(() => { inFlight = undefined })
      return inFlight
    },
  }
}

/** Register daily Beijing-noon work; disposal removes the timer and cancels fetches. */
export function scheduleExchangeRate(store: ExchangeRateStore, onError: (error: unknown) => void): () => void {
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const schedule = (): void => {
    if (disposed) return
    timer = setTimeout(() => {
      void store.refresh().catch(error => { if (!disposed) onError(error) }).finally(schedule)
    }, nextBeijingNoon(Date.now()) - Date.now())
    timer.unref?.()
  }
  schedule()
  return () => {
    disposed = true
    if (timer !== undefined) clearTimeout(timer)
    store.dispose()
  }
}

function convertedRate(rate: UsageRate, multiplier: number): UsageRate {
  // Preserve useful small cache prices while removing binary multiplication noise.
  const convert = (value: number): number => Number((value * multiplier).toPrecision(15))
  return { input: convert(rate.input), cacheRead: convert(rate.cacheRead), cacheWrite: convert(rate.cacheWrite), output: convert(rate.output) }
}

/** Convert USD input once at save time; the stored model cards remain in CNY. */
export function pricingUpdateInCny(update: UsagePricingUpdate, rate: number): UsagePricingUpdate {
  if (update.currency !== 'USD') return { models: update.models }
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('USD/CNY exchange rate is unavailable')
  const models: UsagePricingUpdate['models'] = {}
  for (const [match, edit] of Object.entries(update.models)) {
    if (edit === null) { models[match] = null; continue }
    const converted = readModelEdit({ ...edit, peak: convertedRate(edit.peak, rate), offPeak: convertedRate(edit.offPeak, rate) })
    if (converted === undefined) throw new Error('Converted CNY price exceeds the allowed range')
    models[match] = converted
  }
  return { models }
}
