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
import { type ReactNode } from 'react';
/** Props for one hover-or-pin popover. */
export interface PopoverProps {
    /** Stable id, used to tie the trigger to its panel for assistive tech. */
    readonly id: string;
    /** The panel's accessible name and its own heading. */
    readonly label: string;
    /** One-line description shown as the trigger's tooltip. */
    readonly hint: string;
    /** The trigger's glyph. */
    readonly icon: ReactNode;
    /** Panel width in CSS pixels. */
    readonly width?: number;
    readonly children: ReactNode;
}
/**
 * Render one icon trigger with its panel.
 * @param props - identity, copy, icon, width and panel content.
 * @returns the host element.
 */
export declare function Popover({ id, label, hint, icon, width, children }: PopoverProps): ReactNode;
/** Rate-card glyph: a percent sign inside a card outline. */
export declare function RateIcon(): ReactNode;
/** Provenance glyph: a document with its folded corner. */
export declare function SourceIcon(): ReactNode;
