# Layout check

A browser pass over the surfaces the style split touched. Run on 2026-10-21 with
Google Chrome (headless new mode, device scale 1, `--hide-scrollbars`) against the
rendered CSS and representative markup.

| Page / state | Widths | Themes | Result |
|---|---:|---|---|
| Summary strip, very large figures | 1440, 900 | light, dark | hero and seven tiles stay on their grid; no wrapping or horizontal overflow |
| Summary strip, empty window | 1440, 900 | light, dark | zero tiles and empty note occupy the same frame |
| Call log, loading skeleton and query bar | 1440, 900 | light, dark | query controls wrap at 900; table keeps its horizontal scroll; skeleton columns keep their width |
| Pricing page | 1440, 900 | light, dark | model table holds its columns; inherited/fallback and rate cells remain aligned |
| Reduced motion | 900 | light | `--force-prefers-reduced-motion` renders the same layout; animations are removed by the media query |

The structural guard in `tests/styles.client.spec.ts` checks the assembled sheet
for balanced blocks and the panel/tile layout rules. `pnpm run check:css` runs it
alone.

These checks are deliberately about layout, not pixel snapshots of the running
product: the CSS variables below and above were injected as light/dark themes so
the same component markup could be compared in one browser session.
