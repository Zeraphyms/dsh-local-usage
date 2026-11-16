import type { UsageExchangeRate } from '../types.ts';
/** Everything the exchange block states about the quote on screen. */
export interface ExchangeRateState {
    /** The retained quote, once one has been read. */
    snapshot: UsageExchangeRate | undefined;
    /** Newest quote date the provider can have published now. */
    expectedDate: string | undefined;
    /** Whether a request is in flight. */
    busy: boolean;
    /** Whether the last attempt ended without a usable quote. */
    failed: boolean;
    /** Ask the Host to fetch the reference again. */
    sync: () => void;
}
/**
 * Follow the Host's retained reference rate.
 *
 * The Host answers with both the stored quote and the date the provider can
 * have published by now. Comparing the two is what separates "the scheduled
 * fetch already ran, and the bank has not released today's quote" from "the
 * refresh never happened": the first is normal on every working day before the
 * evening release, the second is the failure this block has to show.
 *
 * Only the first read and a manual sync show a pending state. The periodic
 * re-read is silent, because a block that announces work it did not start
 * every minute reads as noise rather than as progress.
 *
 * @returns the retained quote, how it compares with the source, and the sync action.
 */
export declare function useExchangeRate(): ExchangeRateState;
