/**
 * The rate editor's editing state: drafts, the open model, save status and the
 * one-row-only commit rule.
 *
 * Kept apart from the table so the render can be read as columns and rows. The
 * hook owns the transition rules that are easy to get wrong: switching rows
 * discards the previous draft, discard resets only the open row, and a save
 * validates only the model whose editor is open.
 *
 * @module dsh-local-usage/client/useRateEditor
 */

import { useEffect, useRef, useState, type RefObject } from 'react'
import type { UsageModelPrice, UsagePricingUpdate } from '../types.ts'
import {
  draftsFrom,
  pendingUpdate,
  rateSignature,
  type ModelDrafts,
  type PriceSet,
  type RateDraftResult,
  type RateField,
} from './rate-draft.ts'

/** How long the saved confirmation stays up. */
const CONFIRMATION_MS = 2200


/** Matches the plugin ships with, mirrored from the host's DEFAULT_CONFIG
 * (src/host/config.ts). A card outside this list is the reader's own addition:
 * deleting it removes the card outright. A card inside it is a priced built-in:
 * "deleting" its edit only clears the override, and the card returns at its
 * configured prices ? which is why the button is named differently there. */
export const BUILT_IN_MATCHES = new Set([
  "deepseek-v4.1-flash",
  "deepseek-v4-pro",
  "deepseek-flash",
  "deepseek-v4-flash",
  "glm-5.3-flash",
  "gpt-5.6-sol",
  "grok-4.6",
  "kimi-k3-1",
  "kimi-k2.8-preview",
]);

export interface UseRateEditorOptions {
  readonly models: readonly UsageModelPrice[]
  readonly onSave: (update: UsagePricingUpdate) => Promise<void>
  readonly table: RefObject<HTMLTableElement>
}

export interface RateEditorState {
  readonly drafts: ModelDrafts
  readonly editing: string | undefined
  readonly busy: boolean
  readonly saved: boolean
  readonly failure: string | undefined
  readonly pending: RateDraftResult
  readonly write: (model: string, set: PriceSet, field: RateField, value: string) => void
  readonly switchPeak: (model: string, peakEnabled: boolean) => void
  readonly openEditor: (model: string) => void
  readonly discard: () => void
  readonly commit: () => Promise<void>
  /** Delete one card's edit: removes a user-added card, or clears a built-in's override. */
  readonly removeCard: (match: string) => Promise<void>
}

/**
 * Own the rate editor's state and transitions.
 * @param options - the cards in effect, the save action and the sheet ref.
 * @returns drafts, the open row and the handlers the table needs.
 */
export function useRateEditor({ models, onSave, table }: UseRateEditorOptions): RateEditorState {
  const [drafts, setDrafts] = useState<ModelDrafts>(() => draftsFrom(models))
  const [editing, setEditing] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const lastOpen = useRef<string | undefined>(undefined)

  // A new report re-seeds the fields: after a save the values in effect are the
  // ones just written, and a configuration change brings new cards. The rows are
  // rebuilt on every render of the page, so the identity to watch is the price
  // configuration they carry — not the array around it, which would re-seed the
  // drafts on every keystroke's parent render and drop what was being typed.
  const signature = models
    .map(card => `${card.match}\u0000${String(card.peakEnabled)}\u0000${rateSignature(card.offPeak)}\u0000${rateSignature(card.peak)}`)
    .join('\u0001')
  // `signature` is the identity of `models`: the array is rebuilt on every
  // render of the page, so depending on it would reset the drafts mid-keystroke.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setDrafts(draftsFrom(models)) }, [signature])

  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => { setSaved(false) }, CONFIRMATION_MS)
    return () => { clearTimeout(timer) }
  }, [saved])

  // Opening a row unmounts the word that was pressed, and closing it unmounts
  // the fields: without this the caret falls to the document and a keyboard
  // reader loses their place in the sheet.
  useEffect(() => {
    const previous = lastOpen.current
    lastOpen.current = editing
    const scope = table.current
    if (previous === editing || scope === null) return
    if (editing !== undefined) {
      scope.querySelector<HTMLInputElement>(`[data-rate-field="${CSS.escape(editing)}"]`)?.focus()
    } else if (previous !== undefined) {
      scope.querySelector<HTMLButtonElement>(`[data-rate-edit="${CSS.escape(previous)}"]`)?.focus()
    }
  }, [editing, table])

  const pending = pendingUpdate(drafts, models, editing)

  function write(model: string, set: PriceSet, field: RateField, value: string): void {
    setSaved(false)
    setFailure(undefined)
    setDrafts(current => {
      const draft = current[model]
      if (draft === undefined) return current
      return { ...current, [model]: { ...draft, [set]: { ...draft[set], [field]: value } } }
    })
  }

  function switchPeak(model: string, peakEnabled: boolean): void {
    setSaved(false)
    setFailure(undefined)
    setDrafts(current => {
      const draft = current[model]
      return draft === undefined ? current : { ...current, [model]: { ...draft, peakEnabled } }
    })
  }

  function openEditor(model: string): void {
    if (editing !== undefined && editing !== model) {
      const previous = models.find(candidate => candidate.match === editing)
      const reset = previous === undefined ? undefined : draftsFrom([previous])[editing]
      if (reset !== undefined) {
        setDrafts(current => ({ ...current, [editing]: reset }))
      }
    }
    setSaved(false)
    setFailure(undefined)
    setEditing(model)
  }

  function discard(): void {
    if (editing !== undefined) {
      const card = models.find(candidate => candidate.match === editing)
      const reset = card === undefined ? undefined : draftsFrom([card])[editing]
      if (reset !== undefined) {
        setDrafts(current => ({ ...current, [editing]: reset }))
      }
    }
    setFailure(undefined)
    setEditing(undefined)
  }

  async function commit(): Promise<void> {
    if (pending.status === 'empty') {
      setEditing(undefined)
      return
    }
    if (pending.status !== 'ready') return
    setBusy(true)
    setFailure(undefined)
    try {
      await onSave(pending.update)
      setSaved(true)
      setEditing(undefined)
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  /**
   * Remove one card's edit by writing a null delete: a user-added card leaves
   * the sheet outright, while a built-in's override is cleared and the card
   * returns at its configured prices on the next report.
   */
  async function removeCard(match: string): Promise<void> {
    if (match.length === 0) return;
    setBusy(true);
    setFailure(undefined);
    try {
      await onSave({ models: { [match]: null } });
      setSaved(true);
      setEditing(undefined);
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return { drafts, editing, busy, saved, failure, pending, write, switchPeak, openEditor, discard, commit, removeCard }
}
