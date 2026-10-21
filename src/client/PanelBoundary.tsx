/**
 * Contain a render failure to this panel.
 *
 * The slot renderer already keeps a crashing occupant from unmounting the app,
 * but its crash face is an empty element — indistinguishable from a blank page.
 * This boundary turns any failure into the panel's own error message with its
 * own retry, so a bug here costs the reader a sentence.
 *
 * @module dsh-local-usage/client/PanelBoundary
 */

import { Component, type ReactNode } from 'react'

/**
 * Contain a render failure to this panel.
 *
 * The slot renderer already keeps a crashing occupant from unmounting the app,
 * but its crash face is an empty element — indistinguishable from a blank page.
 * This boundary inside the panel turns any failure into the panel's own error
 * message with its own retry, so a bug here costs the reader a sentence.
 */
export class PanelBoundary extends Component<
  { readonly fallback: ReactNode; readonly children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override componentDidCatch(error: unknown): void {
    console.error('usage panel crashed:', error)
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

