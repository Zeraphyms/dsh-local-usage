/** Input currency choice shared by new-card and existing-card editors. */
import type { ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { UsagePriceCurrency } from '../types.ts'
import { css } from './classes.ts'

export function PriceCurrencySelect({ value, disabled, usdAvailable, onChange, t }: {
  readonly value: UsagePriceCurrency
  readonly disabled: boolean
  readonly usdAvailable: boolean
  readonly onChange: (value: UsagePriceCurrency) => void
  readonly t: PropsLocale<'usage'>['t']
}): ReactNode {
  return (
    <label className={css.currencySelect}>
      <span>{t('pricingInputCurrency')}</span>
      <select aria-label={t('pricingInputCurrency')} value={value} disabled={disabled} onChange={event => { onChange(event.target.value === 'USD' ? 'USD' : 'CNY') }}>
        <option value="CNY">{t('pricingCurrencyCny')}</option>
        <option value="USD" disabled={!usdAvailable}>{t('pricingCurrencyUsd')}</option>
      </select>
      <span className={css.currencyHint}>{t(value === 'USD' ? 'pricingUsdHint' : 'pricingCnyHint')}</span>
    </label>
  )
}
