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
import { Component, type ReactNode } from 'react';
/**
 * Contain a render failure to this panel.
 *
 * The slot renderer already keeps a crashing occupant from unmounting the app,
 * but its crash face is an empty element — indistinguishable from a blank page.
 * This boundary inside the panel turns any failure into the panel's own error
 * message with its own retry, so a bug here costs the reader a sentence.
 */
export declare class PanelBoundary extends Component<{
    readonly fallback: ReactNode;
    readonly children: ReactNode;
}, {
    failed: boolean;
}> {
    state: {
        failed: boolean;
    };
    static getDerivedStateFromError(): {
        failed: boolean;
    };
    componentDidCatch(error: unknown): void;
    render(): ReactNode;
}
