/**
 * Base layout, header, summary strip and the tables under the wave.
 *
 * A fragment of the one sheet the panel injects; order is preserved by
 * `styles.ts`, which assembles these strings once.
 *
 * @module dsh-local-usage/client/styles/base
 */

export const base = String.raw`
/* Usage statistics panel.
 *
 * This is the main column, not a settings page, so the calendar gets the width
 * it needs. Cells are fixed squares whose edge is measured, never fractional
 * tracks: a cell sized by its track has no stable intrinsic box to lay out
 * against, which is what makes dense grids collapse.
 *
 * The heat scale is the DeepSeek blue mixed into the surface — the neutral
 * brand token reads as grey-to-black, which says nothing about intensity. */

/* One element is both the column and the scroll container, the shape every
 * main-slot panel in this product uses. The main column is itself a column
 * flexbox with 'overflow: hidden', so a panel that clips its own overflow is
 * simply cut off: the scroll box has to be this element.
 *
 * Centring comes from 'align-items: center' plus a per-child width, never from
 * 'margin-inline: auto' — that turns a flex child into a fit-content box, so a
 * grid wider than the panel would pin it to its own overflow and the width
 * measurement behind the calendar would never settle.
 *
 * It is also the panel's query container, which is how the rules below keep the
 * layout a function of its width rather than of the figures inside it. Nothing
 * positions against it: the popovers anchor to their own host, and the calendar
 * card is portalled to the document. */
.dlu-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  box-sizing: border-box;
  block-size: 100%;
  min-block-size: 0;
  overflow: auto;
  padding: 26px clamp(24px, 4vw, 48px) 48px;
  background: var(--dsw-alias-bg-base);
  container-type: inline-size;
}

.dlu-panel > * {
  inline-size: 100%;
  max-inline-size: 1280px;
}

.dlu-header {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 20px;
  align-items: flex-start;
  justify-content: space-between;
}

.dlu-headerText {
  min-width: 0;
}

.dlu-heading {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
}

.dlu-subtitle {
  margin: 5px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-controls {
  /* A row that can wrap: the range chips, the two reference buttons and the
   * recount button are 576px of fixed content, which is wider than a narrow
   * panel and used to push the whole page sideways instead of moving down. */
  flex-wrap: wrap;
  display: flex;
  /* Not flex-shrink: 0: that let the row keep its 576px of fixed content and
   * overhang a narrow panel instead of wrapping inside it. Free to shrink, the
   * chips and the buttons move onto a second line as the panel narrows. */
  min-inline-size: 0;
  gap: 10px;
  /* Top-aligned, not centred: the range block can be two rows tall when a custom
   * range is open, and a centred button row would float between its lines. */
  align-items: flex-start;
}

/* The chips, and the two date fields a hand-picked range opens beneath them. */
.dlu-rangeBlock {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-inline-size: 0;
}

.dlu-ranges {
  display: inline-flex;
  align-self: flex-start;
  overflow: hidden;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
}

/* The two ends of the range, one under each end of the chip row: the editor
 * spans the chips' width, so the block keeps one rectangular silhouette. */
.dlu-rangeCustom {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-rangeField {
  display: inline-flex;
  gap: 5px;
  align-items: center;
}

.dlu-rangeField input {
  /* A fixed measure: the native field's default width differs between browsers,
   * and two of them at their own sizes made the row as wide as the chips. */
  inline-size: 124px;
  padding: 3px 6px;
  font: inherit;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
}

.dlu-rangeField input:focus-visible {
  outline: 2px solid var(--dsw-alias-link);
  outline-offset: 1px;
}


.dlu-range {
  padding: 6px 13px;
  font: inherit;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  background: transparent;
  border: 0;
  transition: background-color 120ms ease-out;
}

.dlu-range + .dlu-range {
  border-left: 0.5px solid var(--dsw-alias-border-l2);
}

.dlu-range:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dlu-range[aria-pressed='true'] {
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
}

.dlu-range:focus-visible {
  outline: 2px solid var(--dsw-alias-link);
  outline-offset: -2px;
}

`
