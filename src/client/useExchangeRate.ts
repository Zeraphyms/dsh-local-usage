/** Read the Host's independent USD/CNY cache and explicitly synchronize it. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { UsageExchangeRate, UsageExchangeRateResult } from '../types.ts'
import { EXCHANGE_PATH } from './routes.ts'

/** How often the block re-reads the Host while it is open. */
const POLL_MS = 60_000
/** How soon to retry while the Host still has no quote at all. */
const EMPTY_RETRY_MS = 1_500

/** Everything the exchange block states about the quote on screen. */
export interface ExchangeRateState {
  /** The retained quote, once one has been read. */
  snapshot: UsageExchangeRate | undefined
  /** Newest quote date the provider can have published now. */
  expectedDate: string | undefined
  /** Whether a request is in flight. */
  busy: boolean
  /** Whether the last attempt ended without a usable quote. */
  failed: boolean
  /** Ask the Host to fetch the reference again. */
  sync: () => void
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
export function useExchangeRate(): ExchangeRateState {
  const [snapshot, setSnapshot] = useState<UsageExchangeRate | undefined>()
  const [expectedDate, setExpectedDate] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [request, setRequest] = useState(0)
  const manual = useRef(false)

  const sync = useCallback(() => {
    manual.current = true
    setRequest(value => value + 1)
  }, [])

  useEffect(() => {
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()

    const schedule = (wait: number): void => {
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(() => { void read(false, true) }, wait)
    }

    const read = async (post: boolean, quiet: boolean): Promise<void> => {
      if (!quiet) setBusy(true)
      try {
        const response = await fetch(new URL(EXCHANGE_PATH, window.location.origin), {
          method: post ? 'POST' : 'GET', credentials: 'include', signal: controller.signal,
        })
        const result = await response.json() as Partial<UsageExchangeRateResult>
        if (!live) return
        if (result.snapshot !== null && result.snapshot !== undefined
          && Number.isFinite(result.snapshot.rate) && result.snapshot.rate > 0) setSnapshot(result.snapshot)
        setExpectedDate(typeof result.expectedDate === 'string' ? result.expectedDate : undefined)
        setFailed(!response.ok || result.error !== undefined || result.snapshot === null)
        schedule(result.snapshot === null ? EMPTY_RETRY_MS : POLL_MS)
      } catch {
        // A silent poll that fails keeps the quote already on screen; the block
        // only reports a failure the reader could act on.
        if (live && !quiet) setFailed(true)
        if (live) schedule(POLL_MS)
      } finally {
        if (live && !quiet) setBusy(false)
      }
    }

    const post = manual.current
    manual.current = false
    void read(post, false)
    return () => {
      live = false
      controller.abort()
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [request])

  return { snapshot, expectedDate, busy, failed, sync }
}
