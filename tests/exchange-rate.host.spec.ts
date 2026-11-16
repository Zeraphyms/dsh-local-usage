import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createExchangeRateStore, expectedQuoteDate, nextBeijingNoon, parseExchangeRate, pricingUpdateInCny, scheduleExchangeRate, exchangeRateIsDue } from '../src/host/exchange-rate.ts'
import type { ExchangeRateStore } from '../src/host/exchange-rate.ts'

const data = (rate = 7.23456) => ({ base: 'USD', date: '2026-11-11', rates: { CNY: rate } })
afterEach(() => { vi.useRealTimers() })

describe('USD/CNY rate cache', () => {
  it('rounds the fetched rate to three decimals and reloads it after restart', async () => {
    const file = join(await mkdtemp(join(tmpdir(), 'dlu-fx-')), 'rate.json')
    const fetchRate = vi.fn(async () => data())
    const store = createExchangeRateStore(file, fetchRate)
    const [one, two] = await Promise.all([store.refresh(), store.refresh()])
    expect(fetchRate).toHaveBeenCalledTimes(1)
    expect(one).toEqual(two)
    expect(one.rate).toBe(7.235)
    expect(createExchangeRateStore(file).read()).toEqual(one)
    expect(JSON.parse(await readFile(file, 'utf8')).snapshot.rate).toBe(7.235)
    store.dispose()
  })

  it('retains the previous rate on invalid responses and failed atomic writes', async () => {
    const file = join(await mkdtemp(join(tmpdir(), 'dlu-fx-')), 'rate.json')
    let reply: unknown = data()
    const store = createExchangeRateStore(file, async () => reply)
    const original = await store.refresh()
    reply = data(-1)
    await expect(store.refresh()).rejects.toThrow('Invalid')
    expect(store.read()).toEqual(original)
    reply = data(7.3)
    await rm(file)
    await mkdir(file)
    await expect(store.refresh()).rejects.toThrow()
    expect(store.read()).toEqual(original)
    store.dispose()
  })

  it('validates currency, real dates, finite positive rates and refuses work after disposal', async () => {
    for (const value of [null, { ...data(), base: 'CNY' }, { ...data(), date: '2026-02-30' }, data(0), data(Infinity)]) {
      expect(parseExchangeRate(value, 1)).toBeUndefined()
    }
    const fetchRate = vi.fn(async () => data())
    const store = createExchangeRateStore(join(tmpdir(), 'not-used-fx.json'), fetchRate)
    store.dispose()
    await expect(store.refresh()).rejects.toThrow()
    expect(fetchRate).not.toHaveBeenCalled()
  })
})

describe('provider release date', () => {
  it('expects yesterday before the evening release and Friday over a weekend', () => {
    // Monday 2026-11-16: the release lands around 23:00 Beijing.
    expect(expectedQuoteDate(Date.UTC(2026, 10, 16, 6, 0))).toBe('2026-11-13')
    expect(expectedQuoteDate(Date.UTC(2026, 10, 16, 15, 30))).toBe('2026-11-16')
    // Saturday and Sunday can only have Friday's quote.
    expect(expectedQuoteDate(Date.UTC(2026, 10, 14, 6, 0))).toBe('2026-11-13')
    expect(expectedQuoteDate(Date.UTC(2026, 10, 15, 6, 0))).toBe('2026-11-13')
  })

  it('heals an overdue quote at a bounded rate and leaves a current one alone', async () => {
    const file = join(await mkdtemp(join(tmpdir(), 'dlu-fx-')), 'rate.json')
    const fetchRate = vi.fn(async () => ({ base: 'USD', date: '2026-11-13', rates: { CNY: 6.6719 } }))
    const store = createExchangeRateStore(file, fetchRate)
    // Before any quote exists the read heals it once.
    await store.refreshIfStale(Date.UTC(2026, 10, 16, 6, 0))
    expect(fetchRate).toHaveBeenCalledTimes(1)
    // Behind the provider, but the retry window has not elapsed yet.
    await store.refreshIfStale(Date.UTC(2026, 10, 16, 6, 1))
    expect(fetchRate).toHaveBeenCalledTimes(1)
    // A stored quote the provider cannot have superseded costs no request.
    const current = createExchangeRateStore(join(await mkdtemp(join(tmpdir(), 'dlu-fx-')), 'rate.json'), fetchRate)
    await current.refresh()
    await current.refreshIfStale(Date.UTC(2026, 10, 16, 6, 0))
    expect(fetchRate).toHaveBeenCalledTimes(2)
    store.dispose()
    current.dispose()
  })
})

describe('Beijing noon refresh', () => {
  it('uses UTC+8 regardless of host time zone and advances exactly at noon', () => {
    const noon = Date.UTC(2026, 10, 12, 4)
    expect(nextBeijingNoon(noon - 1)).toBe(noon)
    expect(nextBeijingNoon(noon)).toBe(noon + 86_400_000)
    expect(exchangeRateIsDue({ rate: 7, date: '2026-11-11', updatedAt: noon - 1 }, noon)).toBe(true)
  })

  it('refreshes once each day at noon, survives failure, and cancels on disposal', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-12T03:59:59.000Z'))
    const refresh = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ rate: 7, date: '2026-11-12', updatedAt: Date.now() })
    const dispose = vi.fn()
    const warn = vi.fn()
    const store: ExchangeRateStore = { read: () => undefined, refresh, dispose, refreshIfStale: () => Promise.resolve() }
    const stop = scheduleExchangeRate(store, warn)
    await vi.advanceTimersByTimeAsync(999)
    expect(refresh).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(86_400_000)
    expect(refresh).toHaveBeenCalledTimes(2)
    stop()
    await vi.advanceTimersByTimeAsync(86_400_000)
    expect(refresh).toHaveBeenCalledTimes(2)
    expect(dispose).toHaveBeenCalledTimes(1)
  })
})

it('converts all USD buckets once while preserving CNY writes and deletion semantics', () => {
  const rate = { input: 1, cacheRead: 0.1, cacheWrite: 1.25, output: 5 }
  const update = { currency: 'USD' as const, models: { model: { peakEnabled: true, peak: rate, offPeak: rate }, deleted: null } }
  const saved = pricingUpdateInCny(update, 7.235)
  expect(saved.models.model).toMatchObject({ peak: { input: 7.235, cacheRead: 0.7235, cacheWrite: 9.04375, output: 36.175 } })
  expect(saved.models.deleted).toBeNull()
  expect(saved.currency).toBeUndefined()
  expect(pricingUpdateInCny({ models: update.models }, 7).models).toEqual(update.models)
  expect(() => pricingUpdateInCny(update, 0)).toThrow()
})
