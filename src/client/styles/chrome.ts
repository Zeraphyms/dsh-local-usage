/**
 * Status, loading frame, header tools and project ranking.
 *
 * A fragment of the one sheet the panel injects; order is preserved by
 * `styles.ts`, which assembles these strings once.
 *
 * @module dsh-local-usage/client/styles/chrome
 */

export const chrome = String.raw`/* ── Status ───────────────────────────────────────────────────────────── */

.dlu-status {
  margin: 0;
  font-size: 12.5px;
  color: var(--dsw-alias-label-secondary);
}

/* ── The loading frame ────────────────────────────────────────────────── */

/* The read's own account of itself: one sentence, and a bar that is either a
 * measured share of the work or a sweep standing in for a size nobody knows
 * yet. It sits where the figures will, not floating over them. */
.dlu-loading {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-bottom: 2px;
}

.dlu-loadingText {
  margin: 0;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary);
}

.dlu-loadingTrack {
  position: relative;
  overflow: hidden;
  block-size: 3px;
  background: color-mix(in oklab, var(--dsw-alias-label-primary) 10%, var(--dsw-alias-bg-base));
  border-radius: 2px;
}

.dlu-loadingFill {
  block-size: 100%;
  background: var(--dsw-alias-link);
  border-radius: inherit;
  /* A measured share is a figure, so it takes the panel's bar transition rather
   * than a fresh animation: it should slide to the new count, not restart. */
  transition: inline-size 220ms ease-out;
}

/* Unmeasured: no number to draw, so a third of the track sweeps instead. */
.dlu-loadingTrack[data-measured='false'] .dlu-loadingFill {
  inline-size: 33%;
  animation: dlu-sweep 1.5s ease-in-out infinite;
}

@keyframes dlu-sweep {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(300%);
  }
}

/* A placeholder for a figure: the height and rhythm of the line it stands in
 * for, and nothing else. Ghosts of the *frame* are drawn as the frame, so this
 * is only ever a stand-in for a number or a word. */
/* A placeholder for a figure: the height and rhythm of the line it stands in
 * for, and nothing else.
 *
 * Each ghost is the height of the *line box* it replaces, with the difference
 * carried as a block margin rather than as a taller bar: a text line is mostly
 * leading, and a placeholder drawn at the line's full height would read as a
 * filled block. Matching the box is what keeps the frame from settling when the
 * real line arrives — the whole point of drawing one. */
.dlu-skelLine {
  display: block;
  block-size: 10px;
  background: color-mix(in oklab, var(--dsw-alias-label-primary) 9%, var(--dsw-alias-bg-base));
  border-radius: 4px;
}

/* The hero's label: 12.5px at 1.4. */
.dlu-skelLine[data-width='short'] {
  inline-size: 46px;
  block-size: 9px;
  margin-block: 4.25px;
}

/* The headline figure: pinned to the same 30px block the real one reserves. */
.dlu-skelLine[data-width='hero'] {
  inline-size: 132px;
  block-size: 24px;
  margin-block: 3px;
}

/* The peak note under it: 11px at 1.4. */
.dlu-skelLine[data-width='detail'] {
  inline-size: 108px;
  block-size: 9px;
  margin-block: 3.2px;
}

/* A tile's value: 14.5px at 1.2. */
.dlu-skelLine[data-width='value'] {
  inline-size: 70%;
  margin-block: 3.7px;
}

/* A tile's label: 11px at 1.4. */
.dlu-skelLine[data-width='label'] {
  inline-size: 48%;
  block-size: 8px;
  margin-block: 3.7px;
}

.dlu-skelLine[data-width='total'] {
  inline-size: 72px;
}

.dlu-skelLine[data-width='heading'] {
  inline-size: 112px;
  block-size: 12px;
}

.dlu-skelLine[data-width='scope'] {
  inline-size: 148px;
  block-size: 9px;
}

/* A ranked directory's name: 12.5px. */
.dlu-skelLine[data-width='name'] {
  inline-size: 62%;
  block-size: 9px;
  margin-block: 3px;
}

/* Its path underneath: 10.5px, plus the 1px the real one is offset by. */
.dlu-skelLine[data-width='path'] {
  inline-size: 78%;
  block-size: 8px;
  margin-block: 2.3px;
  margin-block-start: 3.3px;
}

.dlu-skelLine[data-width='cell'] {
  inline-size: 40px;
  block-size: 9px;
  margin-left: auto;
}

/* The calendar's ghost cell: the size and radius of a real one, in the empty
 * step's own colour, so the year reads as a year with nothing in it yet rather
 * than as a different figure. */
.dlu-cellGhost {
  display: block;
  background: color-mix(in oklab, var(--dsw-alias-label-primary) 4%, var(--dsw-alias-bg-base));
  border-radius: 4px;
}

/* The ranking's ghost bars: the shape of the list, which is the one thing about
 * it that can be drawn before it arrives. Its own class rather than the real
 * fill's, so the shipped bars keep their colour. */
.dlu-skelBar {
  display: block;
  block-size: 100%;
  background: color-mix(in oklab, var(--dsw-alias-label-primary) 9%, var(--dsw-alias-bg-base));
  border-radius: inherit;
}

.dlu-failure {
  display: flex;
  gap: 12px;
  align-items: center;
}

.dlu-failure p {
  margin: 0;
  font-size: 12.5px;
  color: var(--dsw-alias-state-error-primary);
}

.dlu-warning {
  color: var(--dsw-alias-state-warn-primary);
}

.dlu-disclosureBody {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 10px;
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-disclosureBody p {
  margin: 0;
}

.dlu-pricingHint {
  color: var(--dsw-alias-label-caption);
}

/* Every right-aligned figure in a table: one line, so a large amount widens its
 * column instead of folding the row in half. */
.dlu-numeric {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-align: right;
}

.dlu-priceMatch {
  color: var(--dsw-alias-label-primary);
}

.dlu-priceCurrency {
  padding-left: 10px;
  font-size: 10.5px;
  color: var(--dsw-alias-label-caption);
}

/* Key/value facts inside a disclosure. */
.dlu-facts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 2px 0 0;
}

.dlu-facts > div {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 10px;
  align-items: baseline;
}

.dlu-facts dt {
  color: var(--dsw-alias-label-caption);
}

.dlu-facts dd {
  min-width: 0;
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
}

.dlu-facts code {
  display: block;
  overflow-wrap: anywhere;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
}

/* ── Header tools: the pages and the recount ──────────────────────────── */

.dlu-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Project ranking: the loading frame keeps the list's shape ────────── */

.dlu-rank {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px 14px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 16px;
}

.dlu-rankHead {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: baseline;
  justify-content: space-between;
}

.dlu-rankList {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* One grid for the column heads and every row, so a number's meaning is stated
 * once at the top instead of beside each figure. */
.dlu-rankRow {
  display: grid;
  /* The three figure columns are sized to what they hold rather than to a fixed
   * pixel count: a four-figure cost in a 92px track is a wrapped number, and a
   * wrapped number is both unreadable and a row that changed height. The name
   * and bar tracks absorb the difference, so the row stays one line. */
  grid-template-columns:
    30px minmax(0, 1fr) minmax(80px, 1.3fr)
    minmax(86px, max-content) minmax(92px, max-content) minmax(54px, max-content);
  gap: 12px;
  align-items: center;
  padding: 6px 0;
}

.dlu-rankRowHead {
  padding-block: 0 5px;
  font-size: 10.5px;
  color: var(--dsw-alias-label-caption);
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}

.dlu-rankPlace {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-caption);
}

.dlu-rankName {
  min-width: 0;
}

/* The bar is the share of the leader, so the ranking stays readable when one
 * project dominates: scaled to the total, every other row would be a sliver. */
.dlu-rankBar {
  block-size: 8px;
  overflow: hidden;
  background: color-mix(in oklab, var(--dsw-alias-label-primary) 9%, transparent);
  border-radius: 999px;
}

.dlu-rankTokens,
.dlu-rankCost,
.dlu-rankSessions {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
  text-align: right;
}

.dlu-rankCost {
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}

`
