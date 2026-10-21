# Performance snapshot

Measured 2026-10-21 on the development machine, against the real fold cache at
`~/.dsh/local-usage/fold-cache.json` (167 sessions, 30,843 samples, 5.0 MiB on
disk). These are call-log queries over folds already in memory; they deliberately
exclude the cold corpus read.

| Query | Result | Wall time | Response JSON |
|---|---:|---:|---:|
| `limit=50` (newest first) | 30,843 matches | 37.8 ms | 28.7 KiB |
| `limit=200&sort=cost` | 30,843 matches | 42.4 ms | 104.9 KiB |
| `limit=50&model=deepseek-v4.1-flash` | 26,850 matches | 34.0 ms | 28.7 KiB |

Process heap after the three queries was 43.6 MiB. The fold cache itself is the
dominant memory item; each query allocates rows for the matching set, prices
every match for the totals facets, sorts, and returns one page.

Reproduce with Node 22 from the repository root:

```sh
node --experimental-strip-types --input-type=module -e "
import { readFileSync } from 'node:fs'
import { queryCalls } from './src/calls.ts'
const doc = JSON.parse(readFileSync(process.env.HOME + '/.dsh/local-usage/fold-cache.json', 'utf8'))
const inputs = Object.entries(doc.sessions).map(([id, s]) => ({ sessionId: id, createdAt: s.createdAt, title: s.title, cwd: s.cwd, samples: s.samples }))
const options = { currency: 'CNY', models: [], fallback: { match: '', peakEnabled: false, offPeak: { input: 2, cacheRead: 0.2, cacheWrite: 2, output: 8 }, peak: { input: 2, cacheRead: 0.2, cacheWrite: 2, output: 8 } }, peakWindows: [], peakWeekdaysOnly: true }
const meta = { generatedAt: Date.now(), scannedSessions: inputs.length, unreadableSessions: 0, cached: true }
const t0 = performance.now()
const page = queryCalls(inputs, options, { limit: 50 }, meta)
console.log((performance.now() - t0).toFixed(1) + 'ms', page.total, JSON.stringify(page).length)
"
```

Interpretation: at this corpus size a page is tens of milliseconds, so paging is
comfortable without an index. A corpus an order of magnitude larger would make
the full-match scan the first thing to measure again; the query already caps the
wire response and never re-reads a log, so the growth is CPU rather than I/O.
