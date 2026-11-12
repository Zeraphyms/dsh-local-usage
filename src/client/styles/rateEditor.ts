/**
 * The rate editor and the responsive/reduced-motion tail.
 *
 * A fragment of the one sheet the panel injects; order is preserved by
 * `styles.ts`, which assembles these strings once.
 *
 * @module dsh-local-usage/client/styles/rateEditor
 */

export const rateEditor = String.raw`/* ── Rate editor ──────────────────────────────────────────────────────── */

.dlu-exchange {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  margin-inline-start: auto;
  padding-block: 2px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}
.dlu-exchangeLine { display: flex; align-items: center; gap: 8px; }
.dlu-exchangeValue { color: var(--dsw-alias-label-primary); font-size: 12px; font-weight: 500; font-variant-numeric: tabular-nums; white-space: nowrap; }
.dlu-exchangeLabel { white-space: nowrap; }
.dlu-exchangeMeta { font-size: 10px; line-height: 1.5; }
.dlu-exchangeSync { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 5px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dlu-exchangeSync:hover { background: color-mix(in oklab, var(--dsw-alias-label-primary) 7%, transparent); }
.dlu-exchangeSync:focus-visible { outline: 2px solid var(--dsw-alias-link); outline-offset: 2px; }
.dlu-exchangeSync:disabled { opacity: 0.45; cursor: wait; }
.dlu-exchange[aria-busy='true'] svg { animation: dlu-exchangeTurn 1s linear infinite; }
@keyframes dlu-exchangeTurn { to { transform: rotate(360deg); } }
.dlu-currencySelect { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-block: 8px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.dlu-currencySelect select { font: inherit; padding: 4px 8px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: 6px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); }
.dlu-currencyHint { color: var(--dsw-alias-label-tertiary); font-size: 10.5px; }
@media (max-width: 720px) { .dlu-pricingPage .dlu-dayHeader { flex-wrap: wrap; gap: 12px; } .dlu-exchange { align-items: flex-start; margin-inline-start: 0; } }
@media (prefers-reduced-motion: reduce) { .dlu-exchange[aria-busy='true'] svg { animation: none; } }

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
