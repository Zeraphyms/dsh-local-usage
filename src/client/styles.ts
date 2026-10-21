/**
 * The panel's stylesheet, assembled from ordered fragments and injected once.
 *
 * The fragments are plain strings rather than CSS modules: a plugin served from
 * disk has to carry and inject its own sheet. Their order is the cascade order,
 * so `styles.ts` is the one place that lists them; each fragment owns one
 * surface and its section comment.
 *
 * @module dsh-local-usage/client/styles
 */

import { base } from './styles/base.ts'
import { summary } from './styles/summary.ts'
import { wave } from './styles/wave.ts'
import { details } from './styles/details.ts'
import { calendar } from './styles/calendar.ts'
import { chrome } from './styles/chrome.ts'
import { rateEditor } from './styles/rateEditor.ts'

/** Element id marking this plugin's injected style tag. */
export const STYLE_ID = 'dsh-local-usage/styles'

/** The complete stylesheet, in cascade order. */
export const styles = [base, summary, wave, details, calendar, chrome, rateEditor].join('\n')
