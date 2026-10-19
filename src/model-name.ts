/**
 * What model a route names.
 *
 * A route is `vendor/namespace:model` in as many spellings as there are vendors
 * selling it: `commoncode/deepseek/deepseek-v4.1-flash`,
 * `workbuddy/cn:deepseek-v4.1-flash`, `cmd/deepseek/deepseek-v4.1-flash-fast`,
 * `deepseek-official/deepseek-flash`. They are one model at one price, and the
 * panel has to say so without being told which vendor prefixes exist.
 *
 * The rule is mechanical, in two steps. The **model** is the last segment of the
 * route — after the last `/` and any `namespace:` in front of it — because every
 * vendor puts its own prefix there and the model at the end. The **identity** is
 * that name reduced to its letters and digits: case folded, and `-`, `.`, `_`
 * removed, so `glm-5.3` and `glm5.3` are the same model and so is
 * `deepseek-v4.1-flash` with `deepseek-v4.1-flash-fast`'s base. A trailing `fast`
 * is a serving tier of the same model, not another model.
 *
 * Nothing here guesses at a catalogue: a name it has never seen keeps its own
 * identity, which is what makes an unpriced vendor route visible as itself.
 *
 * @module dsh-local-usage/model-name
 */

/** The model segment of a route, as the vendor wrote it. */
export function modelOf(route: string): string {
  const trimmed = route.trim()
  const afterSlash = trimmed.slice(trimmed.lastIndexOf('/') + 1)
  const afterNamespace = afterSlash.slice(afterSlash.lastIndexOf(':') + 1)
  return afterNamespace.length > 0 ? afterNamespace : trimmed
}

/**
 * The identity of a model name: what makes two spellings the same model.
 *
 * Letters and digits only, case folded, with a trailing serving tier dropped —
 * `deepseek-v4.1-flash-fast` and `deepseek-v4.1-flash` are the same model, and so
 * are `glm-5.3` and `glm5.3`.
 *
 * @param name - a model name or a card's `match`.
 * @returns the canonical key.
 */
export function modelKey(name: string | undefined): string {
  const folded = (name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  // A trailing tier marker is the vendor's serving choice, not the model.
  return folded.endsWith('fast') && folded.length > 4 ? folded.slice(0, -4) : folded
}

/**
 * The spelling to show for one model out of the spellings it was seen under.
 *
 * The cleanest is the one with the most separators — `glm-5.3` reads as the
 * published name where `glm5.3` reads as a slug — and a name without a serving
 * tier beats one with it.
 *
 * @param names - every spelling observed for one identity, non-empty.
 * @returns the spelling to display.
 */
export function displayModel(names: readonly (string | undefined)[]): string {
  const scored = [...new Set(names.map(name => name ?? ''))].filter(name => name.length > 0)
  if (scored.length === 0) return ''
  return scored.sort((left, right) => {
    const tier = Number(/-fast$/i.test(left)) - Number(/-fast$/i.test(right))
    if (tier !== 0) return tier
    const separators = (right.match(/[-._]/g)?.length ?? 0) - (left.match(/[-._]/g)?.length ?? 0)
    if (separators !== 0) return separators
    return left.length - right.length || left.localeCompare(right)
  })[0] ?? scored[0] ?? ''
}
