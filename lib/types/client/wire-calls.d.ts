/**
 * Normalize one call-log page as it arrives from the Host.
 *
 * The browser bundle is served from disk and swapped live while the Host half
 * only changes on a restart, so a freshly built Client can ask a Host that has
 * never heard of `/calls` — or an older build that answers with a subset of the
 * fields. Every missing figure is filled with a safe zero here, once, so the
 * table stays total over the declared report shape and a version skew costs the
 * reader a column rather than the page.
 *
 * @module dsh-local-usage/client/wire-calls
 */
import type { UsageCallsReport } from '../types.ts';
/**
 * Fill every field the call table reads with a safe default.
 * @param value - the page as received.
 * @returns a page whose declared fields are all present.
 */
export declare function normalizeCallsReport(value: Partial<UsageCallsReport>): UsageCallsReport;
