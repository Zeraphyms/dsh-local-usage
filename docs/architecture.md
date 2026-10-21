# Architecture

本文面向维护者，说明一次读取从会话日志到页面数字经过哪些模块，以及几个容易被改坏的边界。

## Host

```
session logs (durable JSONL)
        │
        ▼
host/session-fold.ts        foldSession → samples + reliability + title/cwd
        │
        ▼
host/corpus-reader.ts       batch projection / exact read
        │                   durable fold-cache lookup + generation guard
        ▼
host/usage-service.ts       assembleReport / queryCallPage
        │                   buildReport / queryCalls + pricing
        ▼
host/http-routes.ts         report / calls / progress / pricing routes
        ▲
        │
src/index.ts                 activation, caches, read queue, invalidation
```

- **Reading is serialized.** `src/index.ts` owns one promise queue (`serialize`); a report, the call log and the warm-up never walk the corpus concurrently. A queued read starts from the folds the previous one filled, and the single progress object therefore describes one read.
- **Folding is pure.** `foldSession` takes events and returns samples; the same function serves the batch projection and the exact read, so both paths count the same settlements.
- **Invalidation is generation-checked.** `apply` increments a per-session generation on `session/event`. A fold that was in flight may answer the current request as a snapshot, but it is not written back to the in-memory or durable cache when its generation moved.
- **The durable cache is optional.** Without `sessionPersistence` there are no revisions; every session takes the exact read and the report is still complete.

## Pricing

`host/config.ts` owns the configured cards and the reader's edits. `pricing.ts` is the single matcher: exact route-scoped cards first, then model identity, then substring. The client's pricing page uses the Host's `routeRates.model` (and the same matcher as a fallback for older Hosts) rather than rebuilding a second matcher.

`rates.ts` writes a candidate table, writes a temporary sibling, renames it, and only then commits the in-memory table. Writes are queued; a failed write leaves both the old memory table and the old file in effect.

## Client

```
UsagePanel / DayDetail / PricingPage / CallsPage
        │
        ├─ range.ts              presets, custom bounds, wave bucket
        ├─ heatmap-grid.ts       calendar arithmetic and window
        ├─ heatmap-shade.ts      quantile ramp
        ├─ RateEditor + RateGroup + rate-row + rate-draft
        └─ CallsPage             host-side filter/sort/page query
```

`UsagePanel` owns page navigation and the report reads; `SummaryStrip`, `RangeControls`, `PanelBoundary`, `DayDetail` and `PricingPage` are presentational or page-level components. `client/routes.ts` mirrors the Host route paths; `client/wire-*.ts` normalizes answers from older Hosts.

## Time contract

- **Calendar days and range bounds** are local calendar dates: use `addDays` / `nextDayStart` / `dayDiff` from `heatmap-grid.ts`, never `86_400_000` arithmetic.
- **Peak pricing** is stated in Beijing time (`beijingClock`), independent of the browser's zone.
- **Call-log timestamps** are rendered in the browser's local time, matching the day window the reader selected.
- A local day may be 23 or 25 hours; all day and range ends are computed as the next local midnight minus one millisecond.

## Build and artifacts

`pnpm run build` starts by removing `lib/` (`scripts/clean-lib.mjs`), then bundles both halves with `tsdown` and emits declarations with the two `tsconfig.*.build.json` programs. `lib/` is committed because the package is distributed from git; a source change must be followed by a build so the shipped JS and declarations stay in step.

`tsconfig.host.json` includes `src/*.ts` and `src/host/**/*.ts`; `tsconfig.client.json` includes `src/client/**/*`. Keep the two programs separate: the halves merge different services under the same Cordis `Context` keys.
