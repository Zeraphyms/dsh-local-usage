/**
 * The per-route rate table, editable.
 *
 * Every route the window recorded is listed with the rate it is actually priced
 * at, and each of the four buckets can be typed over. This is the correction for
 * the rule table's one real failure mode: a substring rule claiming a route it
 * was never written for, which the source badge on each row makes visible before
 * anything is edited.
 *
 * A row is only written when it differs from what is in effect, so opening the
 * editor and saving changes nothing; clearing an overridden row returns the route
 * to its rule instead of pricing it at zero.
 *
 * @module dsh-local-usage/client/RateEditor
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { UsagePricingUpdate, UsageRouteRate } from '../types.ts'
import { draftsFrom, pendingUpdate, RATE_FIELDS } from './rate-draft.ts'
import type { RateDraft, RateDrafts, RateField } from './rate-draft.ts'
import { css } from './classes.ts'
import type { UsageInsightsLocaleKey } from './locales.ts'

/** Column head and field label for each bucket, in table order. */
const COLUMNS: readonly { readonly field: RateField; readonly key: UsageInsightsLocaleKey }[] = [
  { field: 'input', key: 'pricingEditInput' },
  { field: 'cacheRead', key: 'pricingEditCacheRead' },
  { field: 'cacheWrite', key: 'pricingEditCacheWrite' },
  { field: 'output', key: 'pricingEditOutput' },
]

/** How long a confirmation stays on screen before the row settles again. */
const CONFIRMATION_MS = 2600

/** Props for the rate editor. */
export interface RateEditorProps {
  /** Routes the window recorded, ordered by token volume. */
  readonly routes: readonly UsageRouteRate[]
  /** Currency every rate is expressed in, shown once above the table. */
  readonly currency: string
  /** Panel translate function. */
  readonly t: (key: UsageInsightsLocaleKey, params?: Record<string, string>) => string
  /** Compact token formatter, for the volume column. */
  readonly formatTokens: (value: number) => string
  /** Persist one update; rejects with a message the editor shows. */
  readonly onSave: (update: UsagePricingUpdate) => Promise<void>
}

/**
 * Render the editable rate table.
 * @param props - routes, currency, dictionary, formatter and the save action.
 * @returns the editor.
 */
export function RateEditor({ routes, currency, t, formatTokens, onSave }: RateEditorProps): ReactNode {
  const [drafts, setDrafts] = useState<RateDrafts>(() => draftsFrom(routes))
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [failure, setFailure] = useState<string | undefined>(undefined)

  // A new report re-seeds the fields: after a save the values in effect are the
  // ones just written, and after a range change the routes themselves may differ.
  useEffect(() => { setDrafts(draftsFrom(routes)) }, [routes])

  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => { setSaved(false) }, CONFIRMATION_MS)
    return () => { clearTimeout(timer) }
  }, [saved])

  const pending = useMemo(() => pendingUpdate(drafts, routes), [drafts, routes])
  const invalidRoute = pending.status === 'invalid' ? pending.route : undefined
  const canSave = pending.status === 'ready' && !busy

  /** Write one field of one row as typed. */
  function write(route: string, field: RateField, value: string): void {
    setSaved(false)
    setFailure(undefined)
    setDrafts(current => ({
      ...current,
      [route]: { ...(current[route] ?? emptyDraft()), [field]: value },
    }))
  }

  /** Commit the pending update, or the clearing of one row. */
  async function commit(update: UsagePricingUpdate): Promise<void> {
    setBusy(true)
    setFailure(undefined)
    try {
      await onSave(update)
      setSaved(true)
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  /** The source badge of one row. */
  function sourceLabel(entry: UsageRouteRate): string {
    if (entry.source === 'override') return t('pricingSourceOverride')
    if (entry.source === 'fallback') return t('pricingSourceFallback')
    return t('pricingSourceRule', { match: entry.rule ?? '' })
  }

  // Stated rather than omitted. The editor disappearing when a window recorded no
  // routes is indistinguishable from the editor having been removed, and the
  // reader is left with a rate table they can look at but not correct.
  if (routes.length === 0) {
    return (
      <section className={css.editor}>
        <h4 className={css.editorTitle}>{t('pricingEditorTitle')}</h4>
        <p className={css.editorHint}>{t('pricingEditorEmpty')}</p>
      </section>
    )
  }

  return (
    <section className={css.editor}>
      <h4 className={css.editorTitle}>{t('pricingEditorTitle')}</h4>
      <p className={css.editorHint}>{t('pricingEditorHint')}</p>
      <table className={css.editorTable}>
        <thead>
          <tr>
            <th scope="col">{t('pricingRouteColumn')}</th>
            <th scope="col" className={css.numeric}>{t('totalTokens')}</th>
            {COLUMNS.map(column => (
              <th key={column.field} scope="col" className={css.numeric}>{t(column.key)}</th>
            ))}
            <th scope="col"><span className={css.visuallyHidden}>{t('pricingReset')}</span></th>
          </tr>
        </thead>
        <tbody>
          {routes.map(entry => {
            const draft = drafts[entry.route] ?? emptyDraft()
            return (
              <tr key={entry.route}>
                <th scope="row">
                  <code className={css.priceMatch} title={entry.route}>{entry.route}</code>
                  <span className={css.editorSource} data-source={entry.source}>{sourceLabel(entry)}</span>
                </th>
                <td className={css.numeric}>{formatTokens(entry.tokens)}</td>
                {COLUMNS.map(column => (
                  <td key={column.field} className={css.numeric}>
                    <input
                      className={css.editorField}
                      type="text"
                      inputMode="decimal"
                      aria-label={`${entry.route} ${t(column.key)}`}
                      aria-invalid={invalidRoute === entry.route && pending.status === 'invalid' && pending.field === column.field}
                      value={draft[column.field]}
                      disabled={busy}
                      onChange={event => { write(entry.route, column.field, event.target.value) }}
                    />
                  </td>
                ))}
                <td className={css.numeric}>
                  {entry.source === 'override'
                    ? (
                      <button
                        type="button"
                        className={css.rankMore}
                        disabled={busy}
                        onClick={() => { void commit({ set: { [entry.route]: null } }) }}
                      >
                        {t('pricingReset')}
                      </button>
                    )
                    : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className={css.editorActions}>
        <button
          type="button"
          className={css.rankMore}
          disabled={!canSave}
          onClick={() => {
            if (pending.status !== 'ready') return
            void commit(pending.update)
          }}
        >
          {t('pricingSave')}
        </button>
        <span className={css.priceCurrency}>{currency} / 1M</span>
        {pending.status === 'invalid'
          ? <span className={css.editorError} role="alert">{t('pricingInvalid')}</span>
          : saved
            ? <span className={css.editorStatus} role="status">{t('pricingSaved')}</span>
            : null}
        {failure === undefined ? null : (
          <span className={css.editorError} role="alert">{t('pricingSaveFailed', { message: failure })}</span>
        )}
      </div>
    </section>
  )
}

/** A blank row, used for a route the drafts have not caught up with. */
function emptyDraft(): RateDraft {
  return Object.fromEntries(RATE_FIELDS.map(field => [field, ''])) as unknown as RateDraft
}
