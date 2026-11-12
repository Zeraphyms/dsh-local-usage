/** Read the Host's independent USD/CNY cache and explicitly synchronize it. */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { UsageExchangeRate, UsageExchangeRateResult } from '../types.ts'
import { EXCHANGE_PATH } from './routes.ts'

export function useExchangeRate(): {
  snapshot: UsageExchangeRate | undefined
  busy: boolean
  failed: boolean
  sync: () => void
} {
  const [snapshot, setSnapshot] = useState<UsageExchangeRate | undefined>()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [request, setRequest] = useState(0)
  const manual = useRef(false)
  const sync = useCallback(() => { manual.current = true; setRequest(value => value + 1) }, [])
  useEffect(() => {
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()
    const read = async (post: boolean): Promise<void> => {
      setBusy(true)
      try {
        const response = await fetch(new URL(EXCHANGE_PATH, window.location.origin), {
          method: post ? 'POST' : 'GET', credentials: 'include', signal: controller.signal,
        })
        const result = await response.json() as Partial<UsageExchangeRateResult>
        if (!live) return
        if (result.snapshot !== null && result.snapshot !== undefined
          && Number.isFinite(result.snapshot.rate) && result.snapshot.rate > 0) setSnapshot(result.snapshot)
        setFailed(!response.ok || result.error !== undefined || result.snapshot === null)
        if (result.snapshot === null) timer = setTimeout(() => { void read(false) }, 1500)
        else if (Number.isFinite(result.nextUpdateAt)) timer = setTimeout(() => { void read(false) }, Math.min(60_000, Math.max(1000, result.nextUpdateAt! - Date.now() + 1500)))
      } catch {
        if (live) setFailed(true)
      } finally {
        if (live) setBusy(false)
      }
    }
    const post = manual.current
    manual.current = false
    void read(post)
    return () => { live = false; controller.abort(); if (timer !== undefined) clearTimeout(timer) }
  }, [request])
  return { snapshot, busy, failed, sync }
}
