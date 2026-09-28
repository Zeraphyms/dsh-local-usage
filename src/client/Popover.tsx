/**
 * A small icon button that opens a panel on hover and pins it on click.
 *
 * The panel's reference material — the rate table and the provenance block — is
 * consulted, not read start to finish, so it belongs beside the figures rather
 * than at the bottom of the column: hovering previews it, clicking pins it while
 * the reader copies a rate out. Both gestures land on the same panel, and the
 * keyboard reaches it the same way (focus opens nothing; Enter or Space pins,
 * Escape releases).
 *
 * @module dsh-local-usage/client/Popover
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { css } from './classes.ts'

/** Props for one hover-or-pin popover. */
export interface PopoverProps {
  /** Stable id, used to tie the trigger to its panel for assistive tech. */
  readonly id: string
  /** The panel's accessible name and its own heading. */
  readonly label: string
  /** One-line description shown as the trigger's tooltip. */
  readonly hint: string
  /** The trigger's glyph. */
  readonly icon: ReactNode
  /** Panel width in CSS pixels. */
  readonly width?: number
  readonly children: ReactNode
}

/**
 * Render one icon trigger with its panel.
 * @param props - identity, copy, icon, width and panel content.
 * @returns the host element.
 */
export function Popover({ id, label, hint, icon, width = 560, children }: PopoverProps): ReactNode {
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const open = pinned || hovered
  const panelId = `${id}-panel`

  // Both dismissals are document-level because the pointer leaves the host while
  // the panel is still under it: a click anywhere else, or Escape, is the signal.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setPinned(false)
        setHovered(false)
      }
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (host.current !== null && !host.current.contains(event.target as Node)) {
        setPinned(false)
        setHovered(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return (
    <div
      className={css.popoverHost}
      ref={host}
      onPointerEnter={() => { setHovered(true) }}
      onPointerLeave={() => { setHovered(false) }}
    >
      <button
        type="button"
        className={css.iconButton}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        title={hint}
        onClick={() => { setPinned(value => !value) }}
      >
        {icon}
      </button>
      <div
        id={panelId}
        role="dialog"
        aria-label={label}
        className={css.popoverPanel}
        // Hidden rather than unmounted: a pinned panel keeps the reader's
        // half-typed rate fields when they look away and back. The width travels
        // as a custom property rather than an inline `inline-size`, so the
        // narrow-viewport rule can turn the panel into a full-width sheet.
        style={{
          display: open ? undefined : 'none',
          '--dlu-popover-inline': `${String(width)}px`,
        } as CSSProperties}
      >
        <p className={css.popoverTitle}>{label}</p>
        {children}
      </div>
    </div>
  )
}

/** Rate-card glyph: a percent sign inside a card outline. */
export function RateIcon(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.2 10.4 10.8 5.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="5.9" cy="6.4" r="1.05" fill="currentColor" />
      <circle cx="10.1" cy="9.6" r="1.05" fill="currentColor" />
    </svg>
  )
}

/** Provenance glyph: a document with its folded corner. */
export function SourceIcon(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false">
      <path
        d="M3.5 2.75h5.4L12.5 6.3v6.95a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V3.75a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M8.8 2.9v3.6h3.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}
