/**
 * The assembled stylesheet as text.
 *
 * The TypeScript compiler checks the template literal's syntax as TypeScript, not
 * as CSS: a stray declaration or brace inside it still compiles. These cases are
 * the cheap structural guards the style split can run in the normal suite.
 *
 * @module dsh-local-usage/tests/styles
 */

import { describe, expect, it } from 'vitest'
import { styles } from '../src/client/styles.ts'

/** Walk the sheet and return the first line that looks malformed. */
function firstMalformedLine(css: string): { line: number; text: string } | undefined {
  let depth = 0
  const lines = css.split('\n')
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    // A declaration at depth zero is outside every rule; the one that used to
    // sit in the reduced-motion block was exactly this shape.
    if (depth === 0 && /^\s{2,}[a-z-]+\s*:/.test(line)) {
      return { line: index + 1, text: line }
    }
    for (const character of line) {
      if (character === '{') depth += 1
      else if (character === '}') {
        depth -= 1
        if (depth < 0) return { line: index + 1, text: line }
      }
    }
  }
  return depth === 0 ? undefined : { line: lines.length, text: 'unclosed block' }
}

describe('the assembled stylesheet', () => {
  it('keeps every rule inside a block', () => {
    expect(firstMalformedLine(styles)).toBeUndefined()
  })

  it('keeps the panel a size container and the tile count width-driven', () => {
    expect(styles).toContain('container-type: inline-size')
    expect(styles).toContain('repeat(7, minmax(0, 1fr))')
    expect(styles).not.toContain('repeat(auto-fit, minmax(96px, 1fr))')
  })
})
