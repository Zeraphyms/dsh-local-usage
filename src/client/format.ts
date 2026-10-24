/**
 * Locale-aware rendering of the figures on the panel.
 *
 * Copy and figures are two different things, and only one of them is
 * translatable. A dictionary entry can say what a number *means*; it cannot say
 * how that number is written, because symbol placement, grouping, the decimal
 * mark and the compact scale are properties of the reader's language, not of
 * the sentence. So every figure is formatted here against the active locale
 * while every sentence around it comes from the dictionary.
 *
 * No locale means no formatting: these functions take the bare BCP 47-style id
 * the locale service reports and hand it straight to `Intl`, which resolves a
 * region-less tag (`zh`, `en`) on its own and falls back to the default locale
 * for a well-formed tag it does not know. Only a structurally invalid tag or
 * currency code throws, and that is an operator's configuration rather than a
 * defect, so each formatter is built once, cached, and allowed to stay absent —
 * a caller then renders the figure plainly instead of failing the panel.
 *
 * @module dsh-local-usage/client/format
 */

const costFormatters = new Map<string, Intl.NumberFormat | null>()
const tokenFormatters = new Map<string, Intl.NumberFormat | null>()
const integerFormatters = new Map<string, Intl.NumberFormat | null>()
const percentFormatters = new Map<string, Intl.NumberFormat | null>()
const rateFormatters = new Map<string, Intl.NumberFormat | null>()
const dayFormatters = new Map<string, Intl.DateTimeFormat | null>()
const momentFormatters = new Map<string, Intl.DateTimeFormat | null>()
const secondsFormatters = new Map<string, Intl.NumberFormat | null>()
const throughputFormatters = new Map<string, Intl.NumberFormat | null>()

/**
 * Build one formatter once, caching a rejected construction as absent.
 *
 * The cache is what keeps a bad configuration from throwing on every render:
 * `Intl` rejects an unknown currency code and a malformed locale tag with a
 * `RangeError`, and both are values an operator supplies.
 * @param cache - the per-kind formatter cache.
 * @param key - cache key; must carry every input the built formatter depends on.
 * @param build - constructs the formatter.
 * @returns the formatter, or `undefined` when it cannot be built.
 */
function resolve<T extends object>(
  cache: Map<string, T | null>,
  key: string,
  build: () => T,
): T | undefined {
  const hit = cache.get(key)
  if (hit !== undefined) return hit ?? undefined
  let built: T | null
  try {
    built = build()
  } catch {
    built = null
  }
  cache.set(key, built)
  return built ?? undefined
}

/**
 * Fraction digits a money figure is worth: enough that a sub-cent day does not
 * read as a flat zero, and no more.
 * @param value - the figure about to be rendered.
 * @returns the fraction width to format it with.
 */
function costDigits(value: number): number {
  const magnitude = Math.abs(value)
  if (magnitude === 0) return 2
  if (magnitude < 0.01) return 4
  if (magnitude < 1) return 3
  return 2
}

/**
 * Render one money figure in the report's own currency.
 * @param value - the figure.
 * @param currency - ISO currency code the report states; never converted.
 * @param locale - active locale id.
 * @returns the formatted figure, or `CODE 0.00` when the currency is unknown.
 */
export function formatCost(value: number, currency: string, locale: string): string {
  const digits = costDigits(value)
  const formatter = resolve(
    costFormatters,
    `${locale}\u0000${currency}\u0000${String(digits)}`,
    () => new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }),
  )
  // A configured currency that is not an ISO code is the operator's choice, not
  // a defect: fall back to a plain suffix rather than failing the panel.
  return formatter === undefined ? `${currency} ${value.toFixed(digits)}` : formatter.format(value)
}

/** Compact fallback for a locale whose formatter could not be built. */
function plainTokens(value: number): string {
  if (value < 1000) return String(Math.round(value))
  if (value < 1_000_000) return `${trim(value / 1000, 1)}K`
  return `${trim(value / 1_000_000, 2)}M`
}

/** Drop trailing zeros from a fixed-point figure. */
function trim(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.?0+$/, '')
}

/**
 * Render a token count at the compact scale of the reader's language.
 *
 * The scale is not a decoration: English counts in K/M/B while Chinese counts
 * in 万/亿, and a Chinese panel reading `214.87M` is exactly the untranslated
 * figure this module exists to remove. English output is unchanged by the
 * switch, because `Intl` compact notation resolves to the same K/M/B it
 * replaced.
 * @param value - token count.
 * @param locale - active locale id.
 * @returns the compact count.
 */
export function formatTokens(value: number, locale: string): string {
  const formatter = resolve(
    tokenFormatters,
    locale,
    () => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }),
  )
  return formatter === undefined ? plainTokens(value) : formatter.format(value)
}

/**
 * Render a whole figure in full, grouped the way the reader's language groups.
 *
 * This is the drill-down form, for the figures a reader counts rather than
 * compares: the hover card's per-bucket tokens, a day's call count, the number
 * of sessions scanned. A compact count answers "roughly how much" and the
 * hover card exists to answer "exactly how much", which a rounded scale cannot;
 * every such figure is a whole number, so this one formatter serves them all.
 * @param value - the whole figure.
 * @param locale - active locale id.
 * @returns every digit, with locale-appropriate grouping.
 */
export function formatInteger(value: number, locale: string): string {
  const rounded = Math.round(value)
  const formatter = resolve(
    integerFormatters,
    locale,
    () => new Intl.NumberFormat(locale),
  )
  return formatter === undefined ? String(rounded) : formatter.format(rounded)
}

/**
 * Render one ratio as a percentage.
 *
 * Two fraction digits always, never one and never none: a rate is read by
 * comparing windows, and a figure that drops its trailing digits (`99.2%` beside
 * `99.22%`) reads as a change in precision rather than a change in value. The
 * rounding is the language's own, so the symbol and its placement stay correct
 * for the reader.
 * @param value - the ratio, `0..1`.
 * @param locale - active locale id.
 * @returns the formatted percentage.
 */
export function formatPercent(value: number, locale: string): string {
  const formatter = resolve(
    percentFormatters,
    locale,
    () => new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  )
  return formatter === undefined ? `${(value * 100).toFixed(2)}%` : formatter.format(value)
}

/**
 * Render one configured rate for the price table.
 *
 * Four significant digits rather than a fixed fraction width, because rates
 * span from a per-million input price down to a cache-read price four orders
 * below it. A fixed width rounds the cheap end away and `String(value)` renders
 * it in exponential notation — `2e-7` is not a price a reader can check.
 * @param value - currency units per one million tokens.
 * @param locale - active locale id.
 * @returns the rate as written in the active locale.
 */
export function formatRate(value: number, locale: string): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  const formatter = resolve(
    rateFormatters,
    locale,
    () => new Intl.NumberFormat(locale, { maximumSignificantDigits: 4 }),
  )
  return formatter === undefined ? String(value) : formatter.format(value)
}

/**
 * A token count at the scale the price sheet states volume: thousands, millions,
 * billions.
 *
 * Deliberately not localized: the sheet's volume column is read beside rates
 * quoted per million tokens, and a reader comparing a card with a provider's
 * rate card checks it in those units. Every other surface uses `formatTokens`,
 * which follows the reader's language.
 * @param value - token count.
 * @returns the count as `1.2K`, `3.4M`, `5.6B`, or the plain number below 1,000.
 */
export function formatCompact(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  return String(value)
}

/** Local midnight of one `YYYY-MM-DD` day key, or `undefined` when malformed. */
function dayTime(day: string): number | undefined {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (matched === null) return undefined
  const time = new Date(
    Number(matched[1]),
    Number(matched[2]) - 1,
    Number(matched[3]),
  ).getTime()
  return Number.isFinite(time) ? time : undefined
}

/**
 * How much room one rendered figure needs, as a bucket rather than a width.
 *
 * The strip's layout is not allowed to depend on the data — a bigger total must
 * not push a tile onto another row and move the calendar under the reader — so
 * the figure adapts instead: a seven-figure total is set a step smaller, which
 * keeps every digit and keeps the block the same height.
 *
 * The measure is the rendered string's length rather than a measurement of the
 * laid-out element: it is the same answer before and after paint, so nothing
 * reflows in response to its own rendering.
 *
 * @param text - the figure as it will be rendered.
 * @returns the size bucket its length calls for.
 */
export function figureRoom(text: string): 'normal' | 'long' | 'overflowing' {
  if (text.length > 15) return 'overflowing'
  return text.length > 11 ? 'long' : 'normal'
}

/**
 * Render one day key as a date the reader's language writes.
 *
 * The wire carries days as `YYYY-MM-DD` because that is a sortable key, not
 * because it is readable; a reader should not have to decode ISO order to find
 * out which day they are hovering.
 * @param day - the report's day key.
 * @param locale - active locale id.
 * @returns the localized date, or the key itself when it cannot be parsed.
 */
export function formatDay(day: string, locale: string): string {
  const time = dayTime(day)
  if (time === undefined) return day
  const formatter = resolve(
    dayFormatters,
    locale,
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
  )
  return formatter === undefined ? day : formatter.format(time)
}

/**
 * Render one instant as the compact date and clock the call log reads.
 *
 * A call log is a time-ordered list, so the time has to be read at a glance and
 * compared down a column: the month and day carry the row's day, the clock
 * carries its place in that day, and the year is left to the hover title because
 * no window the panel can query spans more than one.
 * @param time - Unix epoch milliseconds.
 * @param locale - active locale id.
 * @returns the localized `MM-DD HH:mm:ss`, or the plain date when `Intl` refuses the locale.
 */
export function formatMoment(time: number, locale: string): string {
  const formatter = resolve(
    momentFormatters,
    locale,
    () => new Intl.DateTimeFormat(locale, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }),
  )
  return formatter === undefined ? new Date(time).toLocaleString() : formatter.format(time)
}

/**
 * Render one millisecond span as the reader's own short duration.
 *
 * `Intl`'s unit style states the unit the way the language writes it — `3.62秒`
 * in Chinese, `3.62 s` in English — so the figure stays a figure and the unit
 * stays copy that the runtime already knows.
 * @param milliseconds - the span.
 * @param locale - active locale id.
 * @returns the localized duration, or seconds with an `s` when `Intl` refuses the locale.
 */
export function formatSeconds(milliseconds: number, locale: string): string {
  const seconds = milliseconds / 1000
  const formatter = resolve(
    secondsFormatters,
    locale,
    () => new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'second',
      unitDisplay: 'short',
      maximumFractionDigits: 2,
    }),
  )
  return formatter === undefined ? `${seconds.toFixed(2)}s` : formatter.format(seconds)
}

/**
 * Render one throughput figure with a single fraction digit.
 * @param value - tokens per second.
 * @param locale - active locale id.
 * @returns the localized figure, without a unit (the column head states it).
 */
export function formatThroughput(value: number, locale: string): string {
  const formatter = resolve(
    throughputFormatters,
    locale,
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
  )
  return formatter === undefined ? value.toFixed(1) : formatter.format(value)
}
