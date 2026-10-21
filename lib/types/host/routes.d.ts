/**
 * Fetch routes the Host half registers.
 *
 * Kept in a leaf module so the HTTP layer and the entry can name the same paths
 * without importing each other; the entry re-exports them for existing callers.
 *
 * @module dsh-local-usage/host/routes
 */
/** Exact route the browser half calls for a report. */
export declare const REPORT_PATH = "/api/dsh-local-usage/report";
/** Exact route the call log reads one page from. */
export declare const CALLS_PATH = "/api/dsh-local-usage/calls";
/** Exact route the browser half writes the per-route rate table to. */
export declare const PRICING_PATH = "/api/dsh-local-usage/pricing";
/** Exact route the browser half polls while a report is being assembled. */
export declare const PROGRESS_PATH = "/api/dsh-local-usage/progress";
