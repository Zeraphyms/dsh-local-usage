/**
 * The range summary, its supporting rows and the table block.
 *
 * A fragment of the one sheet the panel injects; order is preserved by
 * `styles.ts`, which assembles these strings once.
 *
 * @module dsh-local-usage/client/styles/summary
 */

export const summary = String.raw`/* ── Summary: one hero figure, then supporting tiles ───────────────────── */

/* The figures are the header of the page, not the page: the hero and its tiles
 * share one row so the calendar below them starts high on the screen. */
.dlu-summary {
  display: grid;
  grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
  gap: 10px 22px;
  align-items: center;
  padding: 12px 0;
  border-top: 0.5px solid var(--dsw-alias-border-l2);
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}

.dlu-hero {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 22px;
  border-right: 0.5px solid var(--dsw-alias-border-l2);
}

.dlu-heroLabel {
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--dsw-alias-label-tertiary);
}

/* The headline figure: exact to the last digit, and never broken across lines —
 * a money amount split over two lines is unreadable, and it changes the height
 * of the block the whole page hangs off.
 *
 * A total that outgrows the type is set a step smaller rather than allowed to
 * push the tiles aside. The height is pinned to the largest step, so which step
 * a figure lands in cannot change how tall the strip is: the reader switching
 * from a day to a year sees the digits change, not the page move. */
.dlu-heroValue {
  display: block;
  min-block-size: 30px;
  font-size: 27px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.08;
  letter-spacing: -0.02em;
  white-space: nowrap;
  color: var(--dsw-alias-label-primary);
}

.dlu-heroValue[data-room='long'] {
  font-size: 21px;
  line-height: 30px;
}

.dlu-heroValue[data-room='overflowing'] {
  font-size: 16.5px;
  line-height: 30px;
  letter-spacing: -0.01em;
}

.dlu-heroDetail {
  font-size: 11px;
  line-height: 1.4;
  color: var(--dsw-alias-label-caption);
}

/* Figures still on screen after the selection moved on.
 *
 * Only the figures fade, never the box: the strip keeps its exact height and the
 * calendar below it keeps its place, which is the whole reason the previous
 * report is left mounted instead of being replaced by a placeholder. The fade is
 * slow enough to read as a state and not as a glitch, and it is only ever reached
 * when the fold behind it has outlived the flicker threshold. The ranking's own
 * header is left at full strength: it is the line that says what is happening. */
.dlu-summary .dlu-hero,
.dlu-summary .dlu-tiles,
.dlu-rank .dlu-rankList,
.dlu-rank .dlu-rankRowHead {
  transition: opacity 140ms ease-out;
}

.dlu-summary[data-stale='true'] .dlu-hero,
.dlu-summary[data-stale='true'] .dlu-tiles,
.dlu-rank[data-stale='true'] .dlu-rankList,
.dlu-rank[data-stale='true'] .dlu-rankRowHead,
.dlu-rank[data-stale='true'] .dlu-rankMore {
  opacity: 0.45;
}

/* Seven tiles, in a column count the panel's width decides and nothing else.
 *
 * This is the rule that keeps a big figure from moving the page. The hero's
 * track is sized by its own content, so a seven-figure total beside these tiles
 * leaves them less room — and with an auto-fitting grid that narrower room is
 * what decides how many rows they take, which is a change in the strip's height
 * caused by the data. Pinning the count to the container makes the row count a
 * property of the panel, and the figures inside a tile adapt instead.
 *
 * 'minmax(0, 1fr)' rather than a pixel floor, for the same reason: a floor is
 * what turns a narrow panel into a row that overflows it. */
.dlu-tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

@container (min-width: 440px) {
  .dlu-tiles {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container (min-width: 640px) {
  .dlu-tiles {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@container (min-width: 920px) {
  .dlu-tiles {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
}

.dlu-tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 7px 9px;
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
}

/* One figure per line, clipped rather than wrapped if it ever outgrows its tile:
 * the tokens in here are already at a compact scale, so a value that cannot fit
 * is a case worth losing a digit of rather than a reason to move the page. The
 * exact figure is one hover or one drill-down away. */
.dlu-tileValue {
  overflow: hidden;
  font-size: 14.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--dsw-alias-label-primary);
}

.dlu-tileLabel {
  overflow: hidden;
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-tileDetail {
  overflow: hidden;
  font-size: 10.5px;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--dsw-alias-label-caption);
}

.dlu-empty {
  margin: 0;
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary);
}

/* A directory that opens onto its own sessions: the whole cell is the control,
 * so the hit target is the row a reader is already pointing at. */
.dlu-projectToggle {
  display: block;
  inline-size: 100%;
  padding: 0;
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.dlu-projectToggle:focus-visible {
  outline: 2px solid var(--dsw-alias-link);
  outline-offset: 2px;
}

.dlu-projectToggleHint {
  display: block;
  margin-top: 1px;
  font-size: 10.5px;
  color: var(--dsw-alias-label-caption);
}

/* One session of an opened directory, indented under it and set a step quieter
 * than the directory it belongs to. */
.dlu-sessionInTable th,
.dlu-sessionInTable td {
  padding-block: 5px;
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-sessionInTable .dlu-sessionName {
  display: block;
  padding-left: 16px;
  font-size: 11.5px;
  font-weight: 400;
}

/* The pricing page: the day view's frame, because it is the same kind of thing —
 * a page the panel replaces itself with, not a panel floating over the figures. */
.dlu-pricingPage {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.dlu-pricingSection {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 16px;
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}

/* The prose on this page is one argument in four sentences, not four blocks:
 * the product's paragraph margins would turn each of them into a section. */
.dlu-pricingSection > p {
  margin: 0;
  max-inline-size: 78ch;
  font-size: 12.5px;
  line-height: 1.7;
}

/* The sheet's column: a page of prose wide enough for eight columns is not a
 * page anyone reads across, so the table states its own measure and the heading
 * above it ends where the table does. */
.dlu-pricingSectionHead {
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;
}

.dlu-rateSheet {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Narrower than its columns, the sheet scrolls: folding it would put a column
 * under a heading that no longer names it. */
.dlu-rateTableWrap {
  overflow-x: auto;
  scrollbar-width: thin;
}

/* The price sheet: one table, one row per set of prices. The name takes the
 * width the figures do not need; every other column is a share of the table, so
 * the sheet fills the panel the way the tables above and below it do, and the
 * amounts end where the heading over them does. Shares, not pixels: a pixel
 * column would leave the sheet's right edge short of the panel's on a wide
 * window, and a table that stops mid-page reads as an unfinished one. */
.dlu-rateTable {
  inline-size: 100%;
  min-inline-size: 600px;
  table-layout: fixed;
}

.dlu-rateTable .dlu-rateColSet {
  inline-size: 5.5%;
}

.dlu-rateTable .dlu-rateColValue {
  inline-size: 9.5%;
}

.dlu-rateTable .dlu-rateColUsage {
  inline-size: 24%;
}

.dlu-rateTable .dlu-rateColAction {
  inline-size: 6.5%;
}

.dlu-rateTable th[scope='col'] {
  padding-block: 0 7px;
  padding-inline: 5px;
  font-size: 10.5px;
  white-space: nowrap;
}

.dlu-rateTable th[scope='col']:first-child {
  padding-inline: 0 20px;
}

.dlu-rateTable th[scope='col']:last-child {
  padding-inline: 5px 0;
}

/* A column of numbers is read down its right edge, so its heading ends there
 * too: a label flush left over values flush right reads as two columns. */
.dlu-rateTable .dlu-numeric {
  text-align: end;
}

.dlu-rateTable td,
.dlu-rateTable th[scope='rowgroup'] {
  padding-block: 6px;
  /* A model's name and spend belong to its whole block, but a block is read from
   * its first row down: baseline alignment puts the name on the line of the
   * prices it introduces instead of straddling the rule between them. */
  vertical-align: baseline;
}

.dlu-rateTable td.dlu-numeric,
.dlu-rateTable td.dlu-rateSet {
  padding-inline: 5px;
}

/* One model's rows are one block: closed by a stronger rule than the one
 * between its own price sets. */
.dlu-rateGroup > tr:last-child > * {
  border-bottom-color: var(--dsw-alias-border-l2);
}

/* The open block is the one being written, so it is shaded as one object rather
 * than as three rows that happen to sit together. */
.dlu-rateGroup[data-open='true'] > tr > * {
  background: color-mix(in oklab, var(--dsw-alias-label-primary) 2.5%, transparent);
}

/* The model's name is its identity, set in the code face the rest of the panel
 * names routes in. */
.dlu-rateModel {
  padding-inline: 0 20px;
  font-weight: 400;
  text-align: start;
}

.dlu-rateModelLine {
  display: flex;
  gap: 6px;
  align-items: center;
  min-inline-size: 0;
}

.dlu-rateModel .dlu-priceMatch {
  min-inline-size: 0;
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* The cost under the name, for the widths where the usage column is gone. */
.dlu-rateModelMeta {
  display: none;
  margin-top: 3px;
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-caption);
}

/* Which half of the day a row is priced for. The heading above it says so once;
 * the cell itself is a word, because the row is a price, not a period. */
.dlu-rateSet {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}

.dlu-rateTable td.dlu-numeric {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

/* The fields sit exactly where their figures were, one per column: the reader
 * corrects a rate in the cell that states it, not in a form below the table. Two
 * classes deep so the generic field's padding and width do not win: a 60px field
 * with 3px padding stands taller than the row it replaced. */
.dlu-rateTable .dlu-rateField {
  display: block;
  inline-size: 100%;
  padding-block: 1px;
  padding-inline: 4px;
  font-size: 12px;
  line-height: 1.25;
  border-radius: 5px;
}

/* What the model cost, beside the rates it was charged: a gap after the last
 * rate column keeps the amount from reading as a fifth rate. */
.dlu-rateTable td.dlu-rateUsage {
  padding-inline-start: 14px;
}

/* The amount, then the volume it bought: two lines, because the amount is the
 * figure the eye scans down and the tokens are its answer, not its peer. */
.dlu-rateCost {
  display: block;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-primary);
}

.dlu-rateVolume {
  display: block;
  margin-top: 1px;
  overflow: hidden;
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* A model priced by the default card is not stating its price, and says so. */
.dlu-rateDefaultTag {
  flex: none;
  padding: 0 6px;
  font-size: 10px;
  line-height: 1.7;
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
}

/* The action sits below the data in weight: a word, not a button. */
.dlu-rateAction {
  padding: 2px 0;
  font: inherit;
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.dlu-rateActions {
  padding-inline-end: 0;
  text-align: end;
}

.dlu-rateAction:hover {
  color: var(--dsw-alias-link);
  text-decoration: underline;
}

.dlu-rateAction:focus-visible {
  outline: 2px solid var(--dsw-alias-link);
  outline-offset: 2px;
}

.dlu-rateAction:disabled {
  cursor: default;
  opacity: 0.5;
}

/* The reference material folds away. */
.dlu-pricingSummary {
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
}

/* The open block's footer: the switch that shapes the card, then the two words
 * that end the edit. A row of the table so it lands after every field in the tab
 * order, and spans the columns so both actions sit where the action was. */
.dlu-rateEditorCell {
  padding-block: 9px 10px;
}

.dlu-rateToolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  justify-content: space-between;
}

.dlu-rateEditorActions {
  display: flex;
  gap: 16px;
  align-items: center;
}

/* Saving is the one write on this page; it is the only action stated in the
 * link colour rather than in the caption grey. */
.dlu-rateCommit {
  font-weight: 500;
  color: var(--dsw-alias-link);
}

.dlu-editorToggle {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 11.5px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}

.dlu-editorToggle input {
  inline-size: 13px;
  block-size: 13px;
  margin: 0;
  accent-color: var(--dsw-alias-link);
}

/* Below this width the name column is too narrow to hold both the model and the
 * four rates: the usage column is what a reader can do without at the point of
 * correcting a price, and its cost moves under the name. */
@container (max-width: 860px) {
  /* A collapsed column, not a hidden cell: hiding the cells would take them out
   * of the row and shift every cell after them one column to the left. The
   * remaining columns take the freed share, so the sheet still fills the panel. */
  .dlu-rateTable .dlu-rateColUsage {
    inline-size: 0;
    visibility: collapse;
  }

  .dlu-rateTable .dlu-rateColSet {
    inline-size: 6%;
  }

  .dlu-rateTable .dlu-rateColValue {
    inline-size: 12.5%;
  }

  .dlu-rateTable .dlu-rateColAction {
    inline-size: 7%;
  }

  .dlu-rateModelMeta {
    display: block;
  }

  .dlu-rateModel .dlu-priceMatch {
    white-space: normal;
  }
}

`
