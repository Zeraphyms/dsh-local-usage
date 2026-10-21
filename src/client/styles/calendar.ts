/**
 * The calendar grid, day page and hover card.
 *
 * A fragment of the one sheet the panel injects; order is preserved by
 * `styles.ts`, which assembles these strings once.
 *
 * @module dsh-local-usage/client/styles/calendar
 */

export const calendar = String.raw`/* ── Calendar ─────────────────────────────────────────────────────────── */

/* Border-box for the same reason as the wave below: the figure paints its own
 * padding, and the panel must not grow a scrollbar for it. */
.dlu-calendar {
  box-sizing: border-box;

  /* One ramp for the whole figure, every step mixed into the page surface so
   * the whole scale travels with the theme.
   *
   * The empty step is a low wash of the text colour rather than a surface
   * token, because no surface token is offset from the page in both themes:
   * 'bg-layer-2' resolves to the page background itself in the light theme,
   * which left every day the profile did not spend on invisible and made the
   * calendar a scatter of blue rather than a year. Mixing ink into the surface
   * gives a neutral tile that is one quiet step off the page in either theme —
   * light grey on white, a lifted charcoal on black — and keeps the empty step
   * built the same way as the four active ones.
   *
   * It stays clearly below the first active step: that one is *blue*, and a
   * change of hue reads at a glance where a change of lightness this small
   * would not. */
  --usage-heat-0: color-mix(in oklab, var(--dsw-alias-label-primary) 6%, var(--dsw-alias-bg-base));
  --usage-heat-1: color-mix(in oklab, var(--dsw-alias-link) 18%, var(--dsw-alias-bg-base));
  --usage-heat-2: color-mix(in oklab, var(--dsw-alias-link) 38%, var(--dsw-alias-bg-base));
  --usage-heat-3: color-mix(in oklab, var(--dsw-alias-link) 62%, var(--dsw-alias-bg-base));
  --usage-heat-4: var(--dsw-alias-link);

  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px 14px;
  margin: 0;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 16px;
}

.dlu-calendarCaption {
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;
}

.dlu-calendarHeading {
  display: flex;
  gap: 9px;
  align-items: baseline;
}

.dlu-calendarTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}

.dlu-calendarYear {
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary);
}

/* The range the figures were folded over, stated on the picture of the year: a
 * pill rather than another grey label, because it is the one line in this
 * caption that changes when the reader clicks. */
.dlu-calendarRange {
  align-self: center;
  padding: 1px 7px;
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-link);
  white-space: nowrap;
  border: 0.5px solid color-mix(in oklab, var(--dsw-alias-link) 35%, transparent);
  border-radius: 999px;
}

.dlu-calendarTotal {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  /* One line, like every other figure: this one sits in a caption beside the
   * window label, and a wrapped total would change the figure's height. */
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
}

.dlu-calendarScroll {
  padding: 2px 0;
}

.dlu-calendarMeasure {
  inline-size: 100%;
  min-inline-size: 0;
}

.dlu-monthRow,
.dlu-gridRow {
  display: grid;
}

.dlu-monthRow {
  margin-bottom: 6px;
}

.dlu-weekdayColumn {
  display: grid;
  padding-right: 6px;
}

.dlu-weekday {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 10.5px;
  line-height: 1;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-monthLabel {
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1;
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}

.dlu-cells {
  display: grid;
}

.dlu-cells {
  position: relative;
}

/* The selected range, drawn over the cells as one ribbon: a hairline frame and a
 * barely-there wash, so the year keeps every shade it had and the band is read
 * from its outline rather than from a ring around each day. */
.dlu-rangeBand {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  overflow: visible;
  pointer-events: none;
}

.dlu-rangeBand path {
  fill: color-mix(in oklab, var(--dsw-alias-link) 5%, transparent);
  stroke: color-mix(in oklab, var(--dsw-alias-link) 60%, transparent);
  stroke-width: 1.5;
  stroke-linejoin: round;
}


/* The row wrappers exist for the accessibility tree and for explicit cell
 * placement, not for layout: a box of their own would become a grid item and
 * push every cell out of its track. */
.dlu-cellRow {
  display: contents;
}

/* Each cell is a button, so it has to shed the chrome it arrives with:
 * padding, border and background would push the square off its track and paint
 * over the heat step underneath it. */
.dlu-cell {
  padding: 0;
  font: inherit;
  cursor: pointer;
  appearance: none;
  background: none;
  border: 0;
  border-radius: 4px;
  transition: transform 100ms ease-out;
}

.dlu-cell:hover {
  transform: scale(1.15);
}

.dlu-cell:focus-visible {
  outline: 2px solid var(--dsw-alias-link);
  outline-offset: 1px;
}

.dlu-cell[data-level='0'] {
  background: var(--usage-heat-0);
}

.dlu-cell[data-level='1'] {
  background: var(--usage-heat-1);
}

.dlu-cell[data-level='2'] {
  background: var(--usage-heat-2);
}

.dlu-cell[data-level='3'] {
  background: var(--usage-heat-3);
}

.dlu-cell[data-level='4'] {
  background: var(--usage-heat-4);
}

.dlu-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-legendHint {
  font-size: 11px;
  color: var(--dsw-alias-label-caption);
}

.dlu-legendScale {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-left: auto;
}

.dlu-legendLabel {
  font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-legendLabel:first-child {
  margin-right: 2px;
}

.dlu-legendSwatch {
  inline-size: 11px;
  block-size: 11px;
  border-radius: 3px;
}

.dlu-legendSwatch[data-level='0'] {
  background: var(--usage-heat-0);
}

.dlu-legendSwatch[data-level='1'] {
  background: var(--usage-heat-1);
}

.dlu-legendSwatch[data-level='2'] {
  background: var(--usage-heat-2);
}

.dlu-legendSwatch[data-level='3'] {
  background: var(--usage-heat-3);
}

.dlu-legendSwatch[data-level='4'] {
  background: var(--usage-heat-4);
}

.dlu-legendPeak {
  font-variant-numeric: tabular-nums;
}

/* ── Day page ─────────────────────────────────────────────────────────── */

/* The drill-down replaces the panel's whole contents, so it has to carry its
 * own vertical rhythm: the panel's own gap now applies to a single child. */
.dlu-dayDetail {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* Focused when it opens, so a keyboard reader lands at the top of the new page
 * rather than on a document body that no longer holds their cell. It is a page
 * container, not a control, so it draws no ring of its own. */
.dlu-dayDetail:focus {
  outline: none;
}

.dlu-dayHeader {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 20px;
  align-items: flex-start;
  justify-content: space-between;
}

.dlu-dayTitleRow {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.dlu-dayTitle {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--dsw-alias-label-primary);
}

.dlu-dayWeekday {
  font-size: 12.5px;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-projectBlock {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dlu-projectHeading {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary);
}

.dlu-projectTable {
  inline-size: 100%;
  font-size: 12px;
  border-collapse: collapse;
}

.dlu-projectTable th {
  padding: 0 0 6px;
  font-weight: 400;
  color: var(--dsw-alias-label-caption);
  text-align: left;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}

/* Two classes deep so this outranks the header rule above, which sets a
 * text-align of its own. One line per figure: a large amount widens its column
 * and lets the directory name column absorb it, rather than folding the row. */
.dlu-projectTable .dlu-numeric {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-align: right;
}

.dlu-projectTable td {
  padding: 7px 0;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
}

/* A row's name sits on its row's centre line, not on its top edge: the padding
 * above belongs to the column labels, and a body cell that kept it rode a few
 * pixels higher than the figures it labels. */
.dlu-projectTable th.dlu-projectCell {
  padding: 7px 20px 7px 0;
  vertical-align: middle;
}

.dlu-projectName {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}

/* The directory is context for the name above it, not the label: quiet, and
 * allowed to break anywhere, because a path has no spaces to break at. */
.dlu-projectPath {
  display: block;
  margin-top: 2px;
  font-size: 10.5px;
  color: var(--dsw-alias-label-caption);
  overflow-wrap: anywhere;
}

/* ── Hover card ───────────────────────────────────────────────────────── */

.dlu-tooltip {
  position: fixed;
  z-index: 40;
  min-inline-size: 224px;
  padding: 12px 14px;
  pointer-events: none;
  background: var(--dsw-alias-bg-overlay);
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  transform: translate(-50%, -100%) translateY(-9px);
}

.dlu-tooltip[data-placement='below'] {
  transform: translate(-50%, 0);
}

.dlu-tooltipHead {
  display: flex;
  gap: 10px;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
}

.dlu-tooltipDate {
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-primary);
}

.dlu-tooltipWeekday {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-tooltipHero {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 9px;
}

.dlu-tooltipDot {
  inline-size: 12px;
  block-size: 12px;
  flex-shrink: 0;
  border-radius: 50%;
}

.dlu-tooltipDot[data-level='0'] {
  background: var(--usage-heat-0);
}

.dlu-tooltipDot[data-level='1'] {
  background: var(--usage-heat-1);
}

.dlu-tooltipDot[data-level='2'] {
  background: var(--usage-heat-2);
}

.dlu-tooltipDot[data-level='3'] {
  background: var(--usage-heat-3);
}

.dlu-tooltipDot[data-level='4'] {
  background: var(--usage-heat-4);
}

.dlu-tooltipHeroLabel {
  flex: 1;
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-tooltipHeroValue {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-primary);
}

.dlu-tooltipRows {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
}

.dlu-tooltipRows div {
  display: flex;
  gap: 20px;
  align-items: baseline;
  justify-content: space-between;
}

.dlu-tooltipRows dt {
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-tooltipRows dd {
  margin: 0;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary);
}

.dlu-tooltipEmpty {
  margin: 0;
  font-size: 11.5px;
  color: var(--dsw-alias-label-tertiary);
}

`
