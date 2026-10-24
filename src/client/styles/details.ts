/**
 * The range detail page and the call log.
 *
 * A fragment of the one sheet the panel injects; order is preserved by
 * `styles.ts`, which assembles these strings once.
 *
 * @module dsh-local-usage/client/styles/details
 */

export const details = String.raw`/* ── The range's detail view ──────────────────────────────────────────── */

/* A page rather than a figure: the front panel states the range, this one takes
 * it apart. It reuses the day page's frame and tables so the two read as the same
 * surface, and adds only what its own blocks need. */
.dlu-breakdown {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* A page container rather than a control: it is focused on open so a keyboard
 * reader lands at the top of the new page, and draws no ring of its own. */
.dlu-breakdown:focus {
  outline: none;
}

/* The front page's way in, set as a text control: an icon would have to be
 * learned, and this is navigation rather than a tool. */
.dlu-breakout {
  padding: 5px 11px;
  font: inherit;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  background: transparent;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  transition: background-color 120ms ease-out;
}

.dlu-breakout:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}

.dlu-breakout:focus-visible {
  outline: 2px solid var(--dsw-alias-link);
  outline-offset: 1px;
}

/* ── The call log ─────────────────────────────────────────────────────── */

/* The query bar: one control per question a reader can ask of the log. It is a
 * card rather than a row of bare fields so the chips, the two date inputs, a
 * model select, a search, an order and a page size wrap as one surface at any
 * width. */
.dlu-callFilters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: flex-end;
  padding: 12px 14px;
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
}

/* The range chips are a query field like the selects beside them, not the
 * front page's primary range selector: smaller type and padding keep the row
 * reading as one set of filters rather than one large control and five small ones. */
.dlu-callRangeGroup {
  border-radius: 7px;
}

.dlu-callFilters .dlu-callRange {
  padding: 3px 8px;
  font-size: 11px;
  line-height: 1.45;
}

/* A field is a label over its control, so the control's meaning never depends
 * on a placeholder that disappears as soon as the reader types. */
.dlu-callField {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-inline-size: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-callField > input,
.dlu-callField > select {
  box-sizing: border-box;
  min-inline-size: 120px;
  padding: 4px 8px;
  font: inherit;
  font-size: 12px;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 7px;
}

.dlu-callField > input:focus-visible,
.dlu-callField > select:focus-visible {
  outline: 2px solid var(--dsw-alias-link);
  outline-offset: 1px;
}

/* The search field is the one control whose width is content: a session title
 * is longer than a model name, and a search box the width of a page size is a
 * box nobody types a title into. */
.dlu-callSearchField {
  flex: 1 1 220px;
}

.dlu-callSearchField > input {
  inline-size: 100%;
}

/* Six readings, in a column count the panel's width decides: five-and-one at a
 * middle width reads as a layout accident, so the narrow shapes are 3+3 and 2+2. */
.dlu-readings.dlu-callSummary {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

@container (max-width: 1000px) {
  .dlu-readings.dlu-callSummary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container (max-width: 640px) {
  .dlu-readings.dlu-callSummary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.dlu-callScopeNote {
  margin: -12px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--dsw-alias-label-caption);
}

/* The table scrolls sideways rather than folding: eleven columns of figures
 * have a right alignment that carries meaning, and wrapping a cell would break
 * the column a reader scans down. The page still scrolls vertically. */
.dlu-callTableWrap {
  overflow-x: auto;
  scrollbar-width: thin;
  transition: opacity 140ms ease-out;
}

.dlu-callTableWrap[data-stale='true'] {
  opacity: 0.5;
}

.dlu-callTable {
  inline-size: 100%;
  min-inline-size: 1040px;
  font-size: 11.5px;
  table-layout: fixed;
  border-collapse: collapse;
}

/* Fixed column measures: a session title is truncated to its cell, and the
 * numeric columns stay the same width whether a call cost 0.0001 or 12.30. */
.dlu-callColTime {
  inline-size: 92px;
}

.dlu-callColSession {
  inline-size: 200px;
}

.dlu-callColModel {
  inline-size: 150px;
}

.dlu-callColNumber {
  inline-size: 60px;
}

.dlu-callColTiming {
  inline-size: 56px;
}

.dlu-callColCost {
  inline-size: 60px;
}

.dlu-callTable th {
  padding: 8px 10px 7px;
  font-weight: 400;
  color: var(--dsw-alias-label-caption);
  text-align: left;
  white-space: nowrap;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}

.dlu-callTable td {
  padding: 7px 10px;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
}

.dlu-callTable th:first-child,
.dlu-callTable td:first-child {
  padding-inline-start: 0;
}

.dlu-callTable th:last-child,
.dlu-callTable td:last-child {
  padding-inline-end: 0;
}

.dlu-callTable tbody tr:hover td,
.dlu-callTable tbody tr:hover th {
  background: color-mix(in oklab, var(--dsw-alias-label-primary) 3%, transparent);
}

.dlu-callTable .dlu-numeric {
  text-align: right;
  white-space: nowrap;
}

/* The exact time, kept on one line: a timestamp that wraps is two rows of a
 * column whose whole purpose is to be compared downward. */
.dlu-callMoment {
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.dlu-callSessionCell {
  max-inline-size: 250px;
  padding-inline-end: 12px;
  font-weight: 500;
  text-align: left;
  color: var(--dsw-alias-label-primary);
}

.dlu-callSessionName {
  display: block;
  overflow: hidden;
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.dlu-callSubjectMeta {
  display: block;
  margin-top: 1px;
  overflow: hidden;
  font-size: 10px;
  font-weight: 400;
  color: var(--dsw-alias-label-caption);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.dlu-callModelCell {
  max-inline-size: 170px;
}

.dlu-callModelName {
  display: block;
  overflow: hidden;
  font-size: 12px;
  font-weight: 400;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.dlu-callCost {
  color: var(--dsw-alias-label-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-align: right;
}

/* The pager: how much of the match is on screen, then the two moves. */
.dlu-callPager {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  align-items: center;
  justify-content: space-between;
}

.dlu-callPagerNote {
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-callPagerControls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.dlu-callPagerPage {
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary);
}

/* The table before its rows: eleven columns of quiet lines at the height of the
 * real ones, so the page does not jump when the first page lands. */
.dlu-callSkeletonRow .dlu-skelLine {
  animation: dlu-callPulse 1.5s ease-in-out infinite;
}

@keyframes dlu-callPulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

@container (max-width: 720px) {
  .dlu-callSearchField {
    flex-basis: 100%;
  }
}

/* Readings wrap rather than count: unlike the front page's strip, whose height
 * a figure must not be able to change, this grid has room to reflow and a
 * reading that needs two lines may have them. */
.dlu-readings {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.dlu-reading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 9px 11px;
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
}

.dlu-readingLabel {
  font-size: 11px;
  line-height: 1.4;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-readingValue {
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  color: var(--dsw-alias-label-primary);
}

.dlu-readingDetail {
  font-size: 10.5px;
  line-height: 1.4;
  color: var(--dsw-alias-label-caption);
  /* A caption may wrap: an address or a share plus a count is worth two lines
   * where a figure is not. */
  overflow-wrap: anywhere;
}

/* A route no configured card claimed: it is priced at the fallback rate, and
 * the badge is what stops that figure reading as a matched price. */
.dlu-unpricedBadge {
  display: inline-block;
  margin-left: 8px;
  padding: 0 6px;
  font-size: 10px;
  line-height: 1.6;
  color: var(--dsw-alias-label-caption);
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
}

.dlu-sessionName {
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--dsw-alias-label-primary);
}

`
