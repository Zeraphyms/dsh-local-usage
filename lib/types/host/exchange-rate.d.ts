import type { UsageExchangeRate, UsagePricingUpdate } from '../types.ts';
/** Where the host retains its last successful reference rate. */
export declare function exchangeRateFilePath(dshHome: string): string;
/** Next Beijing noon, strictly after the supplied epoch milliseconds. */
export declare function nextBeijingNoon(now: number): number;
/** Whether a snapshot predates the most recent scheduled Beijing noon. */
export declare function exchangeRateIsDue(rate: UsageExchangeRate, now: number): boolean;
/**
 * The newest quote date the provider can have published by this instant.
 *
 * The reference bank publishes one working-day quote around 16:00 CET, which is
 * 23:00 in Beijing. Asking before that hour can only return the previous
 * working day, so the panel must not treat that as a failure to refresh.
 *
 * @param now - Unix epoch milliseconds.
 * @returns the latest publishable date, as `YYYY-MM-DD`.
 */
export declare function expectedQuoteDate(now: number): string;
/** Validate the public source response and round CNY per USD to three decimals. */
export declare function parseExchangeRate(value: unknown, now: number): UsageExchangeRate | undefined;
/** The current reference and refresh operation for one plugin activation. */
export interface ExchangeRateStore {
    read(): UsageExchangeRate | undefined;
    refresh(): Promise<UsageExchangeRate>;
    dispose(): void;
    /**
     * Fetch when the retained quote is older than the provider could have
     * published, so a page read heals a missed or early scheduled refresh.
     * @param now - Unix epoch milliseconds.
     */
    refreshIfStale(now: number): Promise<void>;
}
/** Load the previous snapshot; concurrent refreshes share one bounded request. */
export declare function createExchangeRateStore(path: string, fetchRate?: (signal: AbortSignal) => Promise<unknown>): ExchangeRateStore;
/** Register daily Beijing-noon work; disposal removes the timer and cancels fetches. */
export declare function scheduleExchangeRate(store: ExchangeRateStore, onError: (error: unknown) => void): () => void;
/** Convert USD input once at save time; the stored model cards remain in CNY. */
export declare function pricingUpdateInCny(update: UsagePricingUpdate, rate: number): UsagePricingUpdate;
