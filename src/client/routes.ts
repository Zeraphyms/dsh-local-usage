/**
 * The Fetch routes the browser half talks to.
 *
 * Kept in a module of their own rather than beside the registration code: the
 * call-log page is imported by the panel that also owns the other routes, and a
 * constant imported back out of the entry module would make that a cycle. The
 * entry module re-exports these, so callers that knew the old names keep them.
 *
 * @module dsh-local-usage/client/routes
 */

/** Host route this panel reads its report from. */
export const REPORT_PATH = '/api/dsh-local-usage/report'

/** Host route the call log reads one page from. */
export const CALLS_PATH = '/api/dsh-local-usage/calls'

/** Host route this panel writes its per-route rate table to. */
export const PRICING_PATH = '/api/dsh-local-usage/pricing'

/** Host route this panel asks what a read in flight is doing. */
export const PROGRESS_PATH = '/api/dsh-local-usage/progress'
