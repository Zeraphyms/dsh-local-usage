import type { UsageExchangeRate } from '../types.ts';
export declare function useExchangeRate(): {
    snapshot: UsageExchangeRate | undefined;
    busy: boolean;
    failed: boolean;
    sync: () => void;
};
