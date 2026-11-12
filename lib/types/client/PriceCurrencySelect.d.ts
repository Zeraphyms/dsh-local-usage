/** Input currency choice shared by new-card and existing-card editors. */
import type { ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { UsagePriceCurrency } from '../types.ts';
export declare function PriceCurrencySelect({ value, disabled, usdAvailable, onChange, t }: {
    readonly value: UsagePriceCurrency;
    readonly disabled: boolean;
    readonly usdAvailable: boolean;
    readonly onChange: (value: UsagePriceCurrency) => void;
    readonly t: PropsLocale<'usage'>['t'];
}): ReactNode;
