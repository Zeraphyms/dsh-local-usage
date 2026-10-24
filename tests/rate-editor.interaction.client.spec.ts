// @vitest-environment jsdom
/**
 * The rate editor's save boundary, exercised through real events.
 *
 * The unit tests pin `pendingUpdate`; this one pins the rule the reader sees:
 * editing one model and pressing save must not send another model's draft,
 * even when that other draft differs or is invalid.
 *
 * @module dsh-local-usage/tests/rate-editor-interaction
 */

import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RateEditor } from '../src/client/RateEditor.tsx'
import type { RateRow } from '../src/client/rate-row.ts'
import type { UsagePricingUpdate } from '../src/types.ts'

const t = ((key: string): string => key) as never

const RATE = { input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 }

function row(match: string): RateRow {
  return {
    card: { match, peakEnabled: false, peak: RATE, offPeak: RATE },
    name: match,
    tokens: 100,
    cost: 1,
    routes: 1,
    inherited: false,
  }
}

describe('RateEditor interaction', () => {
  it('saves only the open model, even when another draft is invalid', async () => {
    const onSave = vi.fn(async (_update: UsagePricingUpdate) => {})
    const { container } = render(createElement(RateEditor, {
      rows: [row('a'), row('b')],
      currency: 'CNY',
      locale: 'zh',
      formatCost: (value: number) => `¥${value.toFixed(2)}`,
      t,
      onSave,
    }))

    // Open A and leave an invalid output behind, then open B and change it.
    const editA = container.querySelector<HTMLButtonElement>('[data-rate-edit="a"]')
    if (editA === null) throw new Error('no edit button for a')
    fireEvent.click(editA)
    // The fields are per rate set; target the off-peak output by its row order.
    const aInputs = [...container.querySelectorAll<HTMLInputElement>('input[data-rate-field="a"]')]
    fireEvent.change(aInputs[aInputs.length - 1] as HTMLInputElement, { target: { value: 'nonsense' } })

    const editB = container.querySelector<HTMLButtonElement>('[data-rate-edit="b"]')
    if (editB === null) throw new Error('no edit button for b')
    fireEvent.click(editB)
    const bInputs = [...container.querySelectorAll<HTMLInputElement>('input[data-rate-field="b"]')]
    fireEvent.change(bInputs[bInputs.length - 1] as HTMLInputElement, { target: { value: '7' } })
    fireEvent.click(screen.getByText('pricingSaveOne'))

    await waitFor(() => { expect(onSave).toHaveBeenCalledTimes(1) })
    const update = onSave.mock.calls[0]?.[0]
    if (update === undefined) throw new Error('save was not called with an update')
    expect(Object.keys(update.models)).toEqual(['b'])
  })
})
