// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, renderHook, waitFor } from '@testing-library/react'
import { AddRateCard } from '../src/client/AddRateCard.tsx'
import { RateEditor } from '../src/client/RateEditor.tsx'
import { changeDraftCurrency } from '../src/client/rate-currency.ts'
import { draftsFrom, pendingUpdate } from '../src/client/rate-draft.ts'
import { useExchangeRate } from '../src/client/useExchangeRate.ts'
import type { UsagePricingUpdate } from '../src/types.ts'
const t = ((key: string) => key) as never
const rate = { input: 7, cacheRead: 0.7, cacheWrite: 7, output: 35 }
const card = { match: 'test', peakEnabled: false, peak: rate, offPeak: rate }
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('currency input', () => {
  it('preserves prices across unit changes and submits the selected USD value', () => {
    const usd = changeDraftCurrency(draftsFrom([card]).test!, 'USD', 7)
    expect(usd.offPeak.input).toBe('1')
    expect(pendingUpdate({ test: usd }, [card], 'test').status).toBe('empty')
    usd.offPeak.output = '6'
    expect(pendingUpdate({ test: usd }, [card], 'test')).toMatchObject({ status: 'ready', update: { currency: 'USD', models: { test: { offPeak: { output: 6 } } } } })
    expect(changeDraftCurrency(usd, 'CNY', 8).offPeak.output).toBe('42')
  })

  it('keeps a new CNY model editable when no exchange quote has been loaded', async () => {
    const save = vi.fn(async (_update: UsagePricingUpdate) => {})
    const view = render(createElement(AddRateCard, { existing: [], currency: 'CNY', t, onSave: save }))
    fireEvent.click(view.getByText('pricingAdd'))
    expect((view.getByLabelText('pricingInputCurrency') as HTMLSelectElement).value).toBe('CNY')
    expect(view.getByRole('option', { name: 'pricingCurrencyUsd' }).hasAttribute('disabled')).toBe(true)
    fireEvent.change(view.getByLabelText('pricingAddMatch'), { target: { value: 'new-model' } })
    fireEvent.change(view.getByLabelText('pricingAdd pricingColumnInput'), { target: { value: '7' } })
    fireEvent.click(view.getByText('pricingSaveOne'))
    await waitFor(() => { expect(save).toHaveBeenCalledTimes(1) })
    expect(save.mock.calls[0]?.[0]).toMatchObject({ models: { 'new-model': { offPeak: { input: 7 } } } })
  })

  it('adds a model in USD and marks the submission for Host conversion', async () => {
    const save = vi.fn(async (_update: UsagePricingUpdate) => {})
    const view = render(createElement(AddRateCard, { existing: [], currency: 'CNY', exchangeRate: 7, t, onSave: save }))
    fireEvent.click(view.getByText('pricingAdd'))
    fireEvent.change(view.getByLabelText('pricingInputCurrency'), { target: { value: 'USD' } })
    fireEvent.change(view.getByLabelText('pricingAddMatch'), { target: { value: 'new-model' } })
    fireEvent.change(view.getByLabelText('pricingAdd pricingColumnInput'), { target: { value: '1' } })
    fireEvent.click(view.getByText('pricingSaveOne'))
    await waitFor(() => { expect(save).toHaveBeenCalledTimes(1) })
    expect(save.mock.calls[0]?.[0]).toMatchObject({ currency: 'USD', models: { 'new-model': { offPeak: { input: 1 } } } })
  })

  it('edits an existing CNY model in USD without changing other models', async () => {
    const save = vi.fn(async (_update: UsagePricingUpdate) => {})
    const view = render(createElement(RateEditor, { rows: [{ card, name: 'test', tokens: 0, cost: 0, routes: 1, inherited: false }], currency: 'CNY', exchangeRate: 7, locale: 'en', formatCost: String, t, onSave: save }))
    fireEvent.click(view.getByText('pricingEdit'))
    fireEvent.change(view.getByLabelText('pricingInputCurrency'), { target: { value: 'USD' } })
    expect((view.getByLabelText('test rateSetFlat pricingColumnInput') as HTMLInputElement).value).toBe('1')
    fireEvent.change(view.getByLabelText('test rateSetFlat pricingColumnOutput'), { target: { value: '6' } })
    fireEvent.click(view.getByText('pricingSaveOne'))
    await waitFor(() => { expect(save).toHaveBeenCalledTimes(1) })
    expect(save.mock.calls[0]?.[0]).toMatchObject({ currency: 'USD', models: { test: { offPeak: { output: 6 } } } })
  })
})

it('manual sync uses POST and retains the previous quote when refresh fails', async () => {
  const request = vi.fn().mockResolvedValueOnce(Response.json({ snapshot: { rate: 7.235, date: '2026-11-11', updatedAt: 1 } }))
    .mockResolvedValueOnce(Response.json({ snapshot: { rate: 7.235, date: '2026-11-11', updatedAt: 1 }, error: 'offline' }, { status: 503 }))
  vi.stubGlobal('fetch', request)
  const { result } = renderHook(useExchangeRate)
  await waitFor(() => { expect(result.current.snapshot?.rate).toBe(7.235) })
  act(() => { result.current.sync() })
  await waitFor(() => { expect(result.current.failed).toBe(true) })
  expect(request.mock.calls[1]?.[1].method).toBe('POST')
  expect(result.current.snapshot?.rate).toBe(7.235)
})
