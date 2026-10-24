/**
 * The rate editor and the responsive/reduced-motion tail.
 *
 * A fragment of the one sheet the panel injects; order is preserved by
 * `styles.ts`, which assembles these strings once.
 *
 * @module dsh-local-usage/client/styles/rateEditor
 */

export const rateEditor = String.raw`/* ── Rate editor ──────────────────────────────────────────────────────── */

.dlu-editorTitle {
  margin: 0 0 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}

.dlu-editorHint {
  margin: 0 0 10px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-editorField {
  inline-size: 60px;
  padding: 3px 6px;
  font: inherit;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-primary);
  text-align: right;
  background: var(--dsw-alias-bg-base);
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
}

.dlu-editorField:focus-visible {
  outline: 2px solid var(--dsw-alias-link);
  outline-offset: 0;
}

.dlu-editorField[aria-invalid='true'] {
  border-color: var(--dsw-alias-state-error-primary);
}

.dlu-editorStatus {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-editorError {
  font-size: 11px;
  color: var(--dsw-alias-state-error-primary);
}

.dlu-visuallyHidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 720px) {
  /* One figure per row: the hero stops sharing a line with its tiles, and the
   * ranking drops the bar rather than crushing six columns into a phone. */
  .dlu-summary {
    grid-template-columns: minmax(0, 1fr);
  }

  .dlu-hero {
    padding-right: 0;
    border-right: 0;
  }

  .dlu-rankRow {
    grid-template-columns: 26px minmax(0, 1fr) 84px 62px;
  }

  .dlu-rankBar,
  .dlu-rankSessions {
    display: none;
  }

  

}

@media (max-width: 560px) {
  .dlu-panel {
    padding: 20px 16px 40px;
  }

  .dlu-heroValue {
    font-size: 24px;
  }

  /* Six columns of figures on a phone: keep them, but tighten the type and the
   * name column so the row still reads as one line. */
  .dlu-dayTitle {
    font-size: 17px;
  }

  .dlu-projectTable {
    font-size: 11px;
  }

  .dlu-projectTable td {
    padding: 5px 0;
  }

  .dlu-projectTable th.dlu-projectCell {
    padding-right: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* A spout that cannot move is still a spout: it holds the column up. */
  .dlu-waveSpoutWhale,
  .dlu-waveSpoutJet,
  .dlu-waveSpoutSpray,
  .dlu-waveSpoutRipple {
    animation: none;
  }

  /* Held mid-breath: a crown of drops over the column. */
  .dlu-waveSpoutSpray {
    opacity: 0.9;
    transform: scale(0.95);
  }

  /* A still ring states the waterline; an invisible one states nothing. */
  .dlu-waveSpoutRipple {
    opacity: 0.3;
    transform: scale(0.8);
  }

  .dlu-waveSpoutJet {
    opacity: 0.85;
  }

  .dlu-wavePlot {
    opacity: 1;
    animation: none;
  }

  .dlu-cell,
  .dlu-range,
  .dlu-loadingFill,
  .dlu-summary .dlu-hero,
  .dlu-summary .dlu-tiles,
  .dlu-rank .dlu-rankList,
  .dlu-rank .dlu-rankRowHead {
    transition: none;
  }

  .dlu-cell:hover {
    transform: none;
  }

  /* A sweep that cannot be read as motion is not a progress bar; a still, dimmed
   * track says the same thing without moving. */
  .dlu-loadingTrack[data-measured='false'] .dlu-loadingFill {
    inline-size: 100%;
    opacity: 0.35;
    animation: none;
  }
}
`
